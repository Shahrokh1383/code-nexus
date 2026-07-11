import { useCallback, useEffect } from 'react';
import { useTrackingStore } from '../stores/tracking.store';
import { useWorkspaceStore } from '../stores/workspace.store';

export function useTracking() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const {
    pendingChanges,
    commitHistory,
    isLoading,
    error,
    fetchPendingChanges,
    fetchCommitHistory,
    approveCommit,
    clearError,
  } = useTrackingStore();

  useEffect(() => {
    if (workspace) {
      fetchPendingChanges();
    }
  }, [workspace, fetchPendingChanges]);

  const handleApproveCommit = useCallback(
    async (documentId: string) => {
      await approveCommit(documentId);
    },
    [approveCommit]
  );

  const handleFetchCommitHistory = useCallback(
    async (documentId: string) => {
      await fetchCommitHistory(documentId);
    },
    [fetchCommitHistory]
  );

  return {
    pendingChanges,
    commitHistory,
    isLoading,
    error,
    approveCommit: handleApproveCommit,
    fetchCommitHistory: handleFetchCommitHistory,
    fetchPendingChanges,
    clearError,
  };
}