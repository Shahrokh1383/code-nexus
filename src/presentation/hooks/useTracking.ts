import { useCallback } from 'react';
import { useTrackingStore } from '../stores/tracking.store';

export function useTracking() {
  const {
    selectedDocumentId,
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

  const handleApproveCommit = useCallback(
    async (documentId: string) => { await approveCommit(documentId); },
    [approveCommit]
  );

  return {
    selectedDocumentId,
    pendingChanges,
    commitHistory,
    selectedDiff,
    isLoading,
    error,
    setSelectedDocument,
    approveCommit: handleApproveCommit,
    fetchPendingChanges,
    fetchCommitHistory,
    fetchFileDiff,
    clearError,
  };
}