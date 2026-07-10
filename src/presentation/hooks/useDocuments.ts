import { useCallback, useEffect } from 'react';
import { useDocumentationStore } from '../stores/documentation.store';
import { useWorkspaceStore } from '../stores/workspace.store';

export function useDocuments() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { 
    documents, docFolder, orphans, isLoading, error, 
    fetchDocumentation, registerFolder, detectRelocation, deleteDocument, clearError 
  } = useDocumentationStore();

  useEffect(() => {
    if (workspace) fetchDocumentation();
  }, [workspace, fetchDocumentation]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this document and its metadata?')) {
      await deleteDocument(id);
    }
  }, [deleteDocument]);

  return {
    documents, docFolder, orphans, isLoading, error,
    registerFolder, detectRelocation, deleteDocument: handleDelete, clearError,
  };
}