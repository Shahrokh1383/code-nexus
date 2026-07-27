import { create } from 'zustand';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileHashDto } from '../../domains/tracking/application/dto/file-hash.dto';
import { GranularCommitDto } from '../../domains/tracking/application/dto/granular-commit.dto';
import { ContentDiffDto } from '../../domains/tracking/application/dto/content-diff.dto';
import { DocumentDto } from '../../domains/documentation/application/dto/document.dto';
import { useWorkspaceStore } from './workspace.store';
import { invokeIpc } from '../utils/ipc-invoke'; // FIX: Import shared utility (DRY)

interface TrackingState {
  selectedDocument: DocumentDto | null;
  pendingChanges: FileHashDto[];
  commitHistory: GranularCommitDto[];
  selectedDiff: ContentDiffDto | null;
  isLoading: boolean;
  error: string | null;
  pendingCountByDocId: Record<string, number>;

  setSelectedDocument: (doc: DocumentDto | null) => void;
  fetchPendingChanges: (documentId?: string) => Promise<void>;
  fetchCommitHistory: (documentId: string) => Promise<void>;
  fetchFileDiff: (filePath: string) => Promise<void>;
  approveCommit: (documentId: string) => Promise<void>;
  clearError: () => void;
  fetchAllPendingStatus: () => Promise<void>;
  startRealtimeListener: () => () => void;
  clearStore: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  selectedDocument: null,
  pendingChanges: [],
  commitHistory: [],
  selectedDiff: null,
  isLoading: false,
  error: null,
  pendingCountByDocId: {},

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
      await get().fetchAllPendingStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve commit';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  fetchAllPendingStatus: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      const statuses = await invokeIpc<{ documentId: string; pendingCount: number }[]>(
        IpcChannels.TRACKING_GET_ALL_PENDING_STATUS, workspace.id
      );
      const map: Record<string, number> = {};
      if (statuses) {
        statuses.forEach((s) => { map[s.documentId] = s.pendingCount; });
      }
      set({ pendingCountByDocId: map });
    } catch (error) {
      console.error('Failed to fetch all pending status', error);
    }
  },

  startRealtimeListener: () => {
    const handleUpdate = (_payload: unknown) => {
      get().fetchAllPendingStatus();
      const currentDoc = get().selectedDocument;
      if (currentDoc) {
        get().fetchPendingChanges(currentDoc.id);
      }
    };
    const unsubscribe = window.electronAPI.on(IpcChannels.TRACKING_PENDING_UPDATED, handleUpdate);
    return unsubscribe;
  },

  clearStore: () => set({ 
    selectedDocument: null, 
    pendingChanges: [], 
    commitHistory: [], 
    selectedDiff: null, 
    isLoading: false, 
    error: null, 
    pendingCountByDocId: {} 
  }),
}));