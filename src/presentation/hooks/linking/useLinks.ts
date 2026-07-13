import { useCallback, useEffect } from 'react';
import { useLinkingStore } from '../../stores/linking.store';
import { useWorkspaceStore } from '../../stores/workspace.store';

export function useLinks() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const store = useLinkingStore();

  useEffect(() => {
    if (workspace) store.fetchGraphData();
  }, [workspace, store.fetchGraphData]);

  const handleCreateCodeLink = useCallback(async (codeFileId: string, documentId: string) => {
    await store.createCodeLink(codeFileId, documentId);
  }, [store.createCodeLink]);

  const handleCreateDocumentLink = useCallback(async (parentId: string, childId: string) => {
    await store.createDocumentLink(parentId, childId);
  }, [store.createDocumentLink]);

  return {
    codeLinks: store.codeLinks,
    documentLinks: store.documentLinks,
    unlinkedFiles: store.unlinkedFiles,
    isLoading: store.isLoading,
    error: store.error,
    clearError: store.clearError,
    fetchLinksForDocument: store.fetchLinksForDocument,
    fetchGraphData: store.fetchGraphData,
    createCodeLink: handleCreateCodeLink,
    createDocumentLink: handleCreateDocumentLink,
    removeCodeLink: store.removeCodeLink,
    removeDocumentLink: store.removeDocumentLink,
  };
}