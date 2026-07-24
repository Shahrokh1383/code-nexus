import { useCallback, useEffect } from 'react';
import { useDocumentationStore } from '../stores/documentation.store';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useFileTree } from './useFileTree';

export function useDocuments() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { fetchFileTree } = useFileTree();
  const {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    fetchDocumentation, fetchDeletedDocuments,
    registerFolder, detectRelocation: detectRelocationFromStore,
    softDeleteDocument, permanentDeleteDocument, restoreDocument, clearError
  } = useDocumentationStore();

  useEffect(() => {
    if (workspace) {
      // Automatically attempt to detect relocation before fetching documents
      detectRelocationFromStore().finally(() => {
        fetchDocumentation();
        fetchDeletedDocuments();
      });
    }
  }, [workspace, fetchDocumentation, fetchDeletedDocuments, detectRelocationFromStore]);

  const handleSoftDelete = useCallback(async (id: string) => {
    if (window.confirm('Move this document to trash? It can be restored later.')) {
      await softDeleteDocument(id);
    }
  }, [softDeleteDocument]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    if (window.confirm('Permanently delete this document? This action cannot be undone.')) {
      await permanentDeleteDocument(id);
    }
  }, [permanentDeleteDocument]);

  const handleRestore = useCallback(async (id: string) => {
    await restoreDocument(id);
  }, [restoreDocument]);

  const handleDetectRelocation = useCallback(async () => {
    await detectRelocationFromStore();
    await fetchFileTree();
  }, [detectRelocationFromStore, fetchFileTree]);

  return {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    registerFolder, detectRelocation: handleDetectRelocation,
    softDeleteDocument: handleSoftDelete,
    permanentDeleteDocument: handlePermanentDelete,
    restoreDocument: handleRestore,
    clearError,
  };
}