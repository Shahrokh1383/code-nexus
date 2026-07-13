import { useState, useCallback, useMemo } from 'react';
import { useLinkingStore } from '../stores/linking.store';

export function useUnlinkedFiles(currentDocumentId: string | null) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { unlinkedFiles, createCodeLink, createBulkCodeLinks } = useLinkingStore();

  const isAllSelected = useMemo(() => {
    if (unlinkedFiles.length === 0) return false;
    return unlinkedFiles.every(f => selectedIds.has(f.id));
  }, [selectedIds, unlinkedFiles]);

  const isIndeterminate = useMemo(() => {
    if (selectedIds.size === 0) return false;
    return !isAllSelected;
  }, [selectedIds.size, isAllSelected]);

  const toggleFile = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === unlinkedFiles.length) return new Set();
      return new Set(unlinkedFiles.map(f => f.id));
    });
  }, [unlinkedFiles]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleQuickLink = useCallback(async (fileId: string) => {
    if (!currentDocumentId) return;
    await createCodeLink(fileId, currentDocumentId);
  }, [currentDocumentId, createCodeLink]);

  const handleBulkLink = useCallback(async () => {
    if (!currentDocumentId || selectedIds.size === 0) return;
    await createBulkCodeLinks(Array.from(selectedIds), currentDocumentId);
    clearSelection();
  }, [selectedIds, currentDocumentId, createBulkCodeLinks, clearSelection]);

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