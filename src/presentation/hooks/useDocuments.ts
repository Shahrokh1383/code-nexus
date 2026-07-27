// src/presentation/hooks/useDocuments.ts
import { useCallback, useEffect } from 'react';
import { useDocumentationStore } from '../stores/documentation.store';
import { useWorkspaceStore } from '../stores/workspace.store';

export function useDocuments() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    fetchDocumentation, fetchDeletedDocuments,
    registerFolder,
    softDeleteDocument, permanentDeleteDocument, restoreDocument, clearError
  } = useDocumentationStore();

  useEffect(() => {
    if (workspace) {
      fetchDocumentation();
      fetchDeletedDocuments();
    }
  }, [workspace, fetchDocumentation, fetchDeletedDocuments]);

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

  return {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    registerFolder,
    softDeleteDocument: handleSoftDelete,
    permanentDeleteDocument: handlePermanentDelete,
    restoreDocument: handleRestore,
    clearError,
  };
}