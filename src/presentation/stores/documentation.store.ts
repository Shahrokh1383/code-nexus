// src/presentation/stores/documentation.store.ts
import { create } from 'zustand';
import { IpcChannels } from '../../../electron/ipc/channels';
import { DocumentDto } from '../../domains/documentation/application/dto/document.dto';
import { DocFolderDto } from '../../domains/documentation/application/dto/doc-folder.dto';
import { useWorkspaceStore } from './workspace.store';
import { invokeIpc } from '../utils/ipc-invoke';

interface GetAllDocumentsResponse {
  documents: DocumentDto[];
  docFolder: DocFolderDto | null;
}

interface DocumentationState {
  documents: DocumentDto[];
  docFolder: DocFolderDto | null;
  orphans: DocumentDto[];
  deletedDocuments: DocumentDto[];
  isLoading: boolean;
  error: string | null;

  fetchDocumentation: () => Promise<void>;
  fetchOrphans: () => Promise<void>;
  fetchDeletedDocuments: () => Promise<void>;
  registerFolder: (suggestedPath?: string) => Promise<void>;
  softDeleteDocument: (documentId: string) => Promise<void>;
  permanentDeleteDocument: (documentId: string) => Promise<void>;
  restoreDocument: (documentId: string) => Promise<void>;
  clearError: () => void;
  clearStore: () => void;
}

export const useDocumentationStore = create<DocumentationState>((set, get) => ({
  documents: [],
  docFolder: null,
  orphans: [],
  deletedDocuments: [],
  isLoading: false,
  error: null,

  fetchDocumentation: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      await invokeIpc<void>(IpcChannels.DOCUMENTATION_SYNC_FILES, workspace.id);
      const result = await invokeIpc<GetAllDocumentsResponse>(IpcChannels.DOCUMENTATION_GET_ALL, workspace.id);
      set({ documents: result.documents || [], docFolder: result.docFolder || null, isLoading: false });
      await get().fetchOrphans();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch', isLoading: false });
    }
  },

  fetchOrphans: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      const orphans = await invokeIpc<DocumentDto[]>(IpcChannels.DOCUMENTATION_GET_ORPHANED, workspace.id);
      set({ orphans });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch orphans' });
    }
  },

  fetchDeletedDocuments: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      const deleted = await invokeIpc<DocumentDto[]>(IpcChannels.DOCUMENTATION_GET_DELETED, workspace.id);
      set({ deletedDocuments: deleted });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch deleted' });
    }
  },

  registerFolder: async (suggestedPath?: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_REGISTER_FOLDER, workspace.id, suggestedPath);
      await get().fetchDocumentation(); // Only refetch on folder register/change
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to register', isLoading: false });
    }
  },

  // O(1) Instant UI Update - No Refetch!
  softDeleteDocument: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_SOFT_DELETE_DOCUMENT, documentId, workspace.id);
      set((state) => {
        const doc = state.documents.find(d => d.id === documentId) || state.orphans.find(d => d.id === documentId);
        if (!doc) return {};
        return {
          documents: state.documents.filter(d => d.id !== documentId),
          orphans: state.orphans.filter(d => d.id !== documentId),
          deletedDocuments: [...state.deletedDocuments, doc]
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete' });
    }
  },

  // O(1) Instant UI Update - No Refetch!
  permanentDeleteDocument: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_PERMANENT_DELETE_DOCUMENT, documentId, workspace.id);
      set((state) => ({
        deletedDocuments: state.deletedDocuments.filter(d => d.id !== documentId)
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to permanently delete' });
    }
  },

  // O(1) Instant UI Update - No Refetch!
  restoreDocument: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_RESTORE_DOCUMENT, documentId, workspace.id);
      set((state) => {
        const doc = state.deletedDocuments.find(d => d.id === documentId);
        if (!doc) return {};
        return {
          deletedDocuments: state.deletedDocuments.filter(d => d.id !== documentId),
          documents: doc.isOrphaned ? state.documents : [...state.documents, doc],
          orphans: doc.isOrphaned ? [...state.orphans, doc] : state.orphans
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to restore' });
    }
  },

  clearError: () => set({ error: null }),
  clearStore: () => set({ documents: [], docFolder: null, orphans: [], deletedDocuments: [], isLoading: false, error: null }),
}));