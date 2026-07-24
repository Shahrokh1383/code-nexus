import { create } from 'zustand';
import { IpcChannels } from '../../../electron/ipc/channels';
import { CodeToDocLinkDto, CodeFileSummaryDto } from '../../domains/linking/application/dto/link.dto';
import { DocumentLinkDto } from '../../domains/linking/application/dto/document-link.dto';
import { useWorkspaceStore } from './workspace.store';
import { invokeIpc } from '../utils/ipc-invoke';

interface LinkingState {
  codeLinks: CodeToDocLinkDto[];
  documentLinks: DocumentLinkDto[];
  unlinkedFiles: CodeFileSummaryDto[];
  isLoading: boolean;
  error: string | null;

  fetchGraphData: () => Promise<void>;
  fetchLinksForDocument: (documentId: string) => Promise<void>;
  createCodeLink: (codeFileId: string, documentId: string) => Promise<void>;
  createDocumentLink: (parentDocumentId: string, childDocumentId: string) => Promise<void>;
  removeCodeLink: (linkId: string, documentId: string) => Promise<void>;
  removeDocumentLink: (linkId: string) => Promise<void>;
  createBulkCodeLinks: (codeFileIds: string[], documentId: string) => Promise<void>;
  clearError: () => void;
  clearStore: () => void;
}

export const useLinkingStore = create<LinkingState>((set, get) => ({
  codeLinks: [],
  documentLinks: [],
  unlinkedFiles: [],
  isLoading: false,
  error: null,

  fetchGraphData: async () => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    set({ isLoading: true, error: null });
    try {
      const unlinked = await invokeIpc<CodeFileSummaryDto[]>(IpcChannels.LINKING_GET_UNLINKED_CODEFILES, workspace.id);
      set({ unlinkedFiles: unlinked || [], isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch linking data';
      set({ error: message, isLoading: false });
    }
  },

  fetchLinksForDocument: async (documentId: string) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      const codeLinks = await invokeIpc<CodeToDocLinkDto[]>(IpcChannels.LINKING_GET_LINKS_FOR_DOCUMENT, workspace.id, documentId);
      const docParents = await invokeIpc<DocumentLinkDto[]>(IpcChannels.LINKING_GET_DOCUMENT_PARENTS, workspace.id, documentId);
      const docChildren = await invokeIpc<DocumentLinkDto[]>(IpcChannels.LINKING_GET_DOCUMENT_CHILDREN, workspace.id, documentId);
      const allDocLinks = [...(docParents || []), ...(docChildren || [])];
      set({ codeLinks: codeLinks || [], documentLinks: allDocLinks });
    } catch (error) {
      console.error('Failed to fetch document links', error);
    }
  },

  createCodeLink: async (codeFileId, documentId) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<void>(IpcChannels.LINKING_CREATE_LINK, workspace.id, codeFileId, documentId);
      await get().fetchGraphData();
      await get().fetchLinksForDocument(documentId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create code link' });
    }
  },

  createDocumentLink: async (parentDocumentId, childDocumentId) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<void>(IpcChannels.LINKING_CREATE_DOCUMENT_LINK, workspace.id, parentDocumentId, childDocumentId);
      await get().fetchGraphData();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create document link' });
    }
  },

  removeCodeLink: async (linkId, documentId) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<void>(IpcChannels.LINKING_REMOVE_LINK, workspace.id, linkId);
      await get().fetchGraphData();
      await get().fetchLinksForDocument(documentId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove code link' });
    }
  },

  removeDocumentLink: async (linkId) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
      await invokeIpc<void>(IpcChannels.LINKING_REMOVE_DOCUMENT_LINK, workspace.id, linkId);
      await get().fetchGraphData();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove document link' });
    }
  },

  createBulkCodeLinks: async (codeFileIds, documentId) => {
    const workspace = useWorkspaceStore.getState().workspace;
    if (!workspace) return;
    try {
        await invokeIpc<void>(IpcChannels.LINKING_CREATE_BULK_CODE_LINKS, workspace.id, codeFileIds, documentId);
        await get().fetchGraphData();
        await get().fetchLinksForDocument(documentId);
    } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create bulk links' });
    }
  },

  clearError: () => set({ error: null }),

  clearStore: () => set({ 
    codeLinks: [], 
    documentLinks: [], 
    unlinkedFiles: [], 
    isLoading: false, 
    error: null 
  }),
}));