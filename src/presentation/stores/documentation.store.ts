import { create } from 'zustand';
import { IpcChannels } from '../../../electron/ipc/channels';
import { DocumentDto } from '../../domains/documentation/application/dto/document.dto';
import { DocFolderDto } from '../../domains/documentation/application/dto/doc-folder.dto';
import { useWorkspaceStore } from './workspace.store';

// Mirror the backend IpcResponse contract for strict type safety
interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface DocumentationState {
  documents: DocumentDto[];
  docFolder: DocFolderDto | null;
  orphans: DocumentDto[];
  isLoading: boolean;
  error: string | null;

  fetchDocumentation: () => Promise<void>;
  fetchOrphans: () => Promise<void>;
  registerFolder: (suggestedPath?: string) => Promise<void>;
  detectRelocation: () => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  clearError: () => void;
}

const invokeIpc = async <T>(channel: IpcChannels, ...args: unknown[]): Promise<T> => {
  const response = (await window.electronAPI.invoke(channel, ...args)) as IpcResponse<T>;
  if (!response.success) {
    throw new Error(response.error || 'Unknown IPC error');
  }
  return response.data as T;
};

export const useDocumentationStore = create<DocumentationState>((set, get) => ({
  documents: [],
  docFolder: null,
  orphans: [],
  isLoading: false,
  error: null,

  fetchDocumentation: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;

    set({ isLoading: true, error: null });
    try {
      const result = await invokeIpc<DocumentDto[] | { documents: DocumentDto[], docFolder?: DocFolderDto }>(
        IpcChannels.DOCUMENTATION_GET_ALL, workspace.id
      );

      if (Array.isArray(result)) {
        set({ documents: result, isLoading: false });
      } else {
        set({ documents: result.documents || [], docFolder: result.docFolder || null, isLoading: false });
      }
      await get().fetchOrphans();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch documents';
      set({ error: message, isLoading: false });
    }
  },

  fetchOrphans: async () => {
    try {
      const orphans = await invokeIpc<DocumentDto[]>(IpcChannels.DOCUMENTATION_GET_ORPHANED);
      set({ orphans });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orphans';
      set({ error: message });
    }
  },

  registerFolder: async (suggestedPath?: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_REGISTER_FOLDER, workspace.id, suggestedPath);
      await get().fetchDocumentation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register folder';
      set({ error: message, isLoading: false });
    }
  },

  detectRelocation: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_DETECT_RELOCATION, workspace.id);
      await get().fetchDocumentation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to detect relocation';
      set({ error: message, isLoading: false });
    }
  },

  deleteDocument: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      await invokeIpc<unknown>(IpcChannels.DOCUMENTATION_DELETE_DOCUMENT, documentId, workspace.id);
      await get().fetchDocumentation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));