import { useCallback, useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace';
import { useUnlinkedCodeFilesQuery } from './useLinks';
import { useBulkCodeLinksMutation } from './useLinkCreation';

export function useUnlinkedFiles(currentDocumentId: string | null) {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unlinkedQuery = useUnlinkedCodeFilesQuery(wid);
  const unlinkedFiles = unlinkedQuery.data ?? [];

  const bulkLinkMutation = useBulkCodeLinksMutation();

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
      await bulkLinkMutation
        .mutateAsync({ codeFileIds: [fileId], documentId: currentDocumentId })
        .catch(() => undefined);
    },
    [currentDocumentId, bulkLinkMutation]
  );

  const handleBulkLink = useCallback(async () => {
    if (!currentDocumentId || selectedIds.size === 0) return;
    await bulkLinkMutation
      .mutateAsync({
        codeFileIds: Array.from(selectedIds),
        documentId: currentDocumentId,
      })
      .catch(() => undefined);
    clearSelection();
  }, [selectedIds, currentDocumentId, bulkLinkMutation, clearSelection]);

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