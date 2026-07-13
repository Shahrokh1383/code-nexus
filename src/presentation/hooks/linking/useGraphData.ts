// src/presentation/hooks/linking/useGraphData.ts

import { useCallback } from 'react';
import { useLinks } from './useLinks';

export function useGraphData(documentId: string | null) {
  const { codeLinks, fetchLinksForDocument, removeCodeLink } = useLinks();

  const enrichedLinks = documentId
    ? codeLinks.filter(link => link.documentId === documentId)
    : [];

  const handleRemove = useCallback(async (linkId: string, docId: string) => {
    await removeCodeLink(linkId, docId);
    await fetchLinksForDocument(docId);
  }, [removeCodeLink, fetchLinksForDocument]);

  return {
    codeLinks: enrichedLinks,
    removeLink: handleRemove,
  };
}