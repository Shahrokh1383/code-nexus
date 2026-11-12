import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TRACKING_CHANNELS } from '@shared/ipc/tracking';
import type {
  FileHashDto,
  GranularCommitDto,
  PendingStatusDto,
  FileDiffResult,
  ApproveCommitInput,
} from '@shared/ipc/tracking';
import { invokeIpc } from '../api/trackingIpc';
import { useTrackingStore } from '../stores/trackingStore';
import { useWorkspace } from '@renderer/features/workspace';
import { useDocuments } from '@renderer/features/documentation';
import { trackingKeys } from '../keys';

export function useTracking() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const { documents } = useDocuments();
  const workspaceId = workspace?.rootPath ?? workspace?.id ?? null;

  const {
    selectedDocument,
    searchQuery,
    selectedFilePath,
    isDiffModalOpen,
    setSelectedDocument,
    setSearchQuery,
    setSelectedFilePath,
    setDiffModalOpen,
  } = useTrackingStore();

  const [selectedDiff, setSelectedDiff] = useState<FileDiffResult>(null);

  const pendingQuery = useQuery({
    queryKey: trackingKeys.pending(workspaceId, selectedDocument?.id ?? null),
    queryFn: () =>
      invokeIpc<FileHashDto[]>(TRACKING_CHANNELS.GET_PENDING_CHANGES, {
        workspaceId,
        documentId: selectedDocument?.id,
      }),
    enabled: !!workspaceId,
  });

  const historyQuery = useQuery({
    queryKey: trackingKeys.history(workspaceId, selectedDocument?.id ?? null),
    queryFn: () =>
      invokeIpc<GranularCommitDto[]>(TRACKING_CHANNELS.GET_COMMIT_HISTORY, {
        workspaceId,
        documentId: selectedDocument!.id,
      }),
    enabled: !!workspaceId && !!selectedDocument,
  });

  const statusQuery = useQuery({
    queryKey: trackingKeys.allPendingStatus(workspaceId),
    queryFn: () =>
      invokeIpc<PendingStatusDto[]>(TRACKING_CHANNELS.GET_ALL_PENDING_STATUS, {
        workspaceId,
      }),
    enabled: !!workspaceId,
  });

  const pendingCountByDocId: Record<string, number> = {};
  for (const s of statusQuery.data ?? []) {
    pendingCountByDocId[s.documentId] = s.pendingCount;
  }

  const approveMutation = useMutation({
    mutationFn: (documentId: string) =>
      invokeIpc<void>(TRACKING_CHANNELS.APPROVE_COMMIT, {
        workspaceId,
        documentId,
      } as ApproveCommitInput),
    onSuccess: async (_data, documentId) => {
      await pendingQuery.refetch();
      await queryClient.invalidateQueries({
        queryKey: trackingKeys.history(workspaceId, documentId),
      });
      await queryClient.invalidateQueries({
        queryKey: trackingKeys.allPendingStatus(workspaceId),
      });
    },
  });

  const selectDocument = useCallback(
    (doc: typeof selectedDocument) => setSelectedDocument(doc),
    [setSelectedDocument],
  );

  const fetchFileDiff = useCallback(
    async (filePath: string): Promise<FileDiffResult> => {
      setSelectedFilePath(filePath);
      setDiffModalOpen(true);
      try {
        const diff = await invokeIpc<FileDiffResult>(
          TRACKING_CHANNELS.GET_FILE_DIFF,
          { workspaceId, filePath },
        );
        setSelectedDiff(diff);
        return diff;
      } catch {
        setSelectedDiff(null);
        return null;
      }
    },
    [workspaceId, setSelectedFilePath, setDiffModalOpen],
  );

  useEffect(() => {
    if (!workspaceId) return;
    const handler = (): void => {
      void pendingQuery.refetch();
      void queryClient.invalidateQueries({
        queryKey: trackingKeys.allPendingStatus(workspaceId),
      });
      if (selectedDocument) {
        void queryClient.invalidateQueries({
          queryKey: trackingKeys.pending(workspaceId, selectedDocument.id),
        });
      }
    };
    const unsubscribe = window.api.on(TRACKING_CHANNELS.PENDING_UPDATED, handler);
    return () => unsubscribe();
  }, [workspaceId, selectedDocument, pendingQuery, queryClient]);

  useEffect(() => {
    if (selectedDocument || documents.length === 0) return;
    const first = documents.find((d) => (pendingCountByDocId[d.id] ?? 0) > 0);
    if (first) setSelectedDocument(first);
  }, [documents, pendingCountByDocId, selectedDocument, setSelectedDocument]);

  const error =
    pendingQuery.error ?? historyQuery.error ?? statusQuery.error ?? approveMutation.error;

  const clearError = useCallback((): void => {
    approveMutation.reset();
    void queryClient.resetQueries({ queryKey: trackingKeys.all });
  }, [approveMutation, queryClient]);

  return {
    selectedDocument,
    pendingChanges: pendingQuery.data ?? [],
    commitHistory: historyQuery.data ?? [],
    selectedDiff,
    isLoading:
      pendingQuery.isLoading || historyQuery.isLoading || approveMutation.isPending,
    isError: !!error,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    pendingCountByDocId,
    searchQuery,
    selectedFilePath,
    isDiffModalOpen,
    setSearchQuery,
    setDiffModalOpen,
    selectDocument,
    approveCommit: approveMutation.mutate,
    fetchFileDiff,
    clearError,
    fetchAllPendingStatus: statusQuery.refetch,
  };
}