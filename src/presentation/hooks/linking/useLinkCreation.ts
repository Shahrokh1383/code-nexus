import { useCallback } from 'react';
import { useLinkingStore } from '../../stores/linking.store';

export function useLinkCreation(onSuccess: () => void) {
  const store = useLinkingStore();

  const handleModalLink = useCallback(async (
    sourceIds: string[], 
    targetDocumentId: string, 
    sourceType: 'code' | 'document'
  ) => {
    if (sourceType === 'code') {
      await store.createBulkCodeLinks(sourceIds, targetDocumentId);
    } else {
      const state = useLinkingStore.getState();
      for (const id of sourceIds) {
        await state.createDocumentLink(targetDocumentId, id);
      }
    }
    onSuccess();
  }, [store, onSuccess]);

  return { handleModalLink };
}