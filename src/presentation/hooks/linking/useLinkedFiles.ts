import { useCallback } from 'react';
import { useLinkingStore } from '../../stores/linking.store';

export function useLinkedFiles(documentId: string | null) {
  // Always call hooks unconditionally
  const codeLinks = useLinkingStore((s) => s.codeLinks);
  const removeCodeLink = useLinkingStore((s) => s.removeCodeLink);
  const fetchLinksForDocument = useLinkingStore((s) => s.fetchLinksForDocument);

  // Filter only when documentId is set; otherwise empty array
  const filteredLinks = documentId
    ? codeLinks.filter(link => link.documentId === documentId)
    : [];

  const removeLink = useCallback(
    async (linkId: string, docId: string) => {
      await removeCodeLink(linkId, docId);
      // The store's removeCodeLink already refreshes, but we call explicitly to be safe
      await fetchLinksForDocument(docId);
    },
    [removeCodeLink, fetchLinksForDocument]
  );

  return {
    codeLinks: filteredLinks,
    removeLink,
  };
}