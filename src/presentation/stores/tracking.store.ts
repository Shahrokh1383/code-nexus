import { create } from 'zustand';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileHashDto } from '../../domains/tracking/application/dto/file-hash.dto';
import { GranularCommitDto } from '../../domains/tracking/application/dto/granular-commit.dto';
import { useWorkspaceStore } from './workspace.store';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TrackingState {
  pendingChanges: FileHashDto[];
  commitHistory: GranularCommitDto[];
  isLoading: boolean;
  error: string | null;

  fetchPendingChanges: (documentId?: string) => Promise<void>;
  fetchCommitHistory: (documentId: string) => Promise<void>;
  approveCommit: (documentId: string) => Promise<void>;
  clearError: () => void;
}

const invokeIpc = async <T>(channel: IpcChannels, ...args: unknown[]): Promise<T> => {
  const response = (await window.electronAPI.invoke(channel, ...args)) as IpcResponse<T>;
  if (!response.success) {
    throw new Error(response.error || 'Unknown IPC error');
  }
  return response.data as T;
};

export const useTrackingStore = create<TrackingState>((set, get) => ({
  pendingChanges: [],
  commitHistory: [],
  isLoading: false,
  error: null,

  fetchPendingChanges: async (documentId?: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;

    set({ isLoading: true, error: null });
    try {
      const changes = await invokeIpc<FileHashDto[]>(
        IpcChannels.TRACKING_GET_PENDING_CHANGES,
        workspace.id,
        documentId
      );
      set({ pendingChanges: changes || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch pending changes';
      set({ error: message, isLoading: false });
    }
  },

  fetchCommitHistory: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;

    set({ isLoading: true, error: null });
    try {
      const history = await invokeIpc<GranularCommitDto[]>(
        IpcChannels.TRACKING_GET_COMMIT_HISTORY,
        workspace.id,
        documentId
      );
      set({ commitHistory: history || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch commit history';
      set({ error: message, isLoading: false });
    }
  },

  approveCommit: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;

    set({ isLoading: true, error: null });
    try {
      await invokeIpc<unknown>(
        IpcChannels.TRACKING_APPROVE_COMMIT,
        workspace.id,
        documentId
      );
      // Refresh both pending changes and commit history
      await get().fetchPendingChanges(documentId);
      await get().fetchCommitHistory(documentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve commit';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));