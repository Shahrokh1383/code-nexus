import { create } from 'zustand';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileHashDto } from '../../domains/tracking/application/dto/file-hash.dto';
import { GranularCommitDto } from '../../domains/tracking/application/dto/granular-commit.dto';
import { ContentDiffDto } from '../../domains/tracking/application/dto/content-diff.dto';
import { DocumentDto } from '../../domains/documentation/application/dto/document.dto';
import { useWorkspaceStore } from './workspace.store';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TrackingState {
  selectedDocument: DocumentDto | null;
  pendingChanges: FileHashDto[];
  commitHistory: GranularCommitDto[];
  selectedDiff: ContentDiffDto | null;
  isLoading: boolean;
  error: string | null;

  setSelectedDocument: (doc: DocumentDto | null) => void;
  fetchPendingChanges: (documentId?: string) => Promise<void>;
  fetchCommitHistory: (documentId: string) => Promise<void>;
  fetchFileDiff: (filePath: string) => Promise<void>;
  approveCommit: (documentId: string) => Promise<void>;
  clearError: () => void;
}

const invokeIpc = async <T>(channel: IpcChannels, ...args: unknown[]): Promise<T> => {
  const response = (await window.electronAPI.invoke(channel, ...args)) as IpcResponse<T>;
  if (!response.success) throw new Error(response.error || 'Unknown IPC error');
  return response.data as T;
};

export const useTrackingStore = create<TrackingState>((set, get) => ({
  selectedDocument: null,
  pendingChanges: [],
  commitHistory: [],
  selectedDiff: null,
  isLoading: false,
  error: null,

  setSelectedDocument: (doc) => {
    set({ selectedDocument: doc, selectedDiff: null });
    if (doc) {
      get().fetchPendingChanges(doc.id);
      get().fetchCommitHistory(doc.id);
    } else {
      get().fetchPendingChanges();
      set({ commitHistory: [] });
    }
  },

  fetchPendingChanges: async (documentId?: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      const changes = await invokeIpc<FileHashDto[]>(
        IpcChannels.TRACKING_GET_PENDING_CHANGES, workspace.id, documentId
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
        IpcChannels.TRACKING_GET_COMMIT_HISTORY, workspace.id, documentId
      );
      set({ commitHistory: history || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch commit history';
      set({ error: message, isLoading: false });
    }
  },

  fetchFileDiff: async (filePath: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      const diff = await invokeIpc<ContentDiffDto | null>(
        IpcChannels.TRACKING_GET_FILE_DIFF, workspace.id, filePath
      );
      set({ selectedDiff: diff });
    } catch (error) {
      console.error('Failed to fetch diff', error);
      set({ selectedDiff: null });
    }
  },

  approveCommit: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      await invokeIpc<unknown>(IpcChannels.TRACKING_APPROVE_COMMIT, workspace.id, documentId);
      await get().fetchPendingChanges(documentId);
      await get().fetchCommitHistory(documentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve commit';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));