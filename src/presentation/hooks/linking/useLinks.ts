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
    ...store,
    createCodeLink: handleCreateCodeLink,
    createDocumentLink: handleCreateDocumentLink,
  };
}