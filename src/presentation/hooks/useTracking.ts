// src/presentation/hooks/useTracking.ts
import { useCallback } from 'react';
import { useTrackingStore } from '../stores/tracking.store';
import { DocumentDto } from '../../domains/documentation/application/dto/document.dto';

export function useTracking() {
  const {
    selectedDocument,
    pendingChanges,
    commitHistory,
    selectedDiff,
    isLoading,
    error,
    setSelectedDocument,
    fetchPendingChanges,
    fetchCommitHistory,
    fetchFileDiff,
    approveCommit,
    clearError,
  } = useTrackingStore();

  const handleSelectDocument = useCallback(
    (doc: DocumentDto | null) => setSelectedDocument(doc),
    [setSelectedDocument]
  );

  const handleApproveCommit = useCallback(
    async (documentId: string) => { await approveCommit(documentId); },
    [approveCommit]
  );

  return {
    selectedDocument,
    pendingChanges,
    commitHistory,
    selectedDiff,
    isLoading,
    error,
    selectDocument: handleSelectDocument,
    approveCommit: handleApproveCommit,
    fetchPendingChanges,
    fetchCommitHistory,
    fetchFileDiff,
    clearError,
  };
}