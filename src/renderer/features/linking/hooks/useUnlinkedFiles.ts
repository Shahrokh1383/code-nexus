import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LINKING_CHANNELS } from '@shared/ipc/linking';
import { useWorkspace } from '../../workspace';
import { invokeIpc } from '../api/linkingIpc';
import { linkingKeys } from '../keys';
import { useUnlinkedCodeFilesQuery } from './useLinks';

export function useUnlinkedFiles(currentDocumentId: string | null) {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unlinkedQuery = useUnlinkedCodeFilesQuery(wid);
  const unlinkedFiles = unlinkedQuery.data ?? [];

  const createCodeLinkMutation = useMutation({
    mutationFn: async (input: { codeFileId: string; documentId: string }) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.CREATE_LINK, {
        workspaceId: wid,
        codeFileId: input.codeFileId,
        documentId: input.documentId,
      });
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      void queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, input.documentId),
      });
    },
  });

  const createBulkCodeLinksMutation = useMutation({
    mutationFn: async (input: { codeFileIds: string[]; documentId: string }) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.CREATE_BULK_CODE_LINKS, {
        workspaceId: wid,
        codeFileIds: input.codeFileIds,
        documentId: input.documentId,
      });
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      void queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, input.documentId),
      });
    },
  });

  const isAllSelected = useMemo(() => {
    if (unlinkedFiles.length === 0) return false;
    return unlinkedFiles.every((f) => selectedIds.has(f.id));
  }, [selectedIds, unlinkedFiles]);

  const isIndeterminate = useMemo(() => {
    if (selectedIds.size === 0) return false;
    return !isAllSelected;
  }, [selectedIds.size, isAllSelected]);

  const toggleFile = useCallback((fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  // Legacy size-based check preserved verbatim (DI-18 — behavior not corrected).
  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === unlinkedFiles.length) return new Set();
      return new Set(unlinkedFiles.map((f) => f.id));
    });
  }, [unlinkedFiles]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleQuickLink = useCallback(
    async (fileId: string) => {
      if (!currentDocumentId) return;
      await createCodeLinkMutation
        .mutateAsync({ codeFileId: fileId, documentId: currentDocumentId })
        .catch(() => undefined);
    },
    [currentDocumentId, createCodeLinkMutation]
  );

  const handleBulkLink = useCallback(async () => {
    if (!currentDocumentId || selectedIds.size === 0) return;
    await createBulkCodeLinksMutation
      .mutateAsync({
        codeFileIds: Array.from(selectedIds),
        documentId: currentDocumentId,
      })
      .catch(() => undefined);
    clearSelection();
  }, [selectedIds, currentDocumentId, createBulkCodeLinksMutation, clearSelection]);

  return {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleFile,
    toggleAll,
    clearSelection,
    handleQuickLink,
    handleBulkLink,
  };
}