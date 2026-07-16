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
    pendingCountByDocId,
    setSelectedDocument,
    fetchPendingChanges,
    fetchCommitHistory,
    fetchFileDiff,
    approveCommit,
    clearError,
    fetchAllPendingStatus,
    startRealtimeListener,
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
    pendingCountByDocId,
    selectDocument: handleSelectDocument,
    approveCommit: handleApproveCommit,
    fetchPendingChanges,
    fetchCommitHistory,
    fetchFileDiff,
    clearError,
    fetchAllPendingStatus,
    startRealtimeListener,
  };
}