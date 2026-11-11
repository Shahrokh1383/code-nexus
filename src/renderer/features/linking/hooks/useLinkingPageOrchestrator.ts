import { useEffect } from 'react';
import { useDocuments } from '../../documentation';
import { useWorkspace } from '../../workspace';
import { setSelectedDocId, useSelectedDocId } from '../stores/selectedDocument';

/**
 * Selection orchestration for the linking page. Deliberately does not touch
 * linking queries — React Query's key partitioning (codeLinks/documentLinks
 * by documentId) handles the fetch-on-selection-change, and the
 * 'linking:updated' + 'tree-updated' push channels handle cross-cutting
 * invalidation.
 */
export function useLinkingPageOrchestrator() {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const { documents } = useDocuments();
  const selectedDocId = useSelectedDocId();

  useEffect(() => {
    setSelectedDocId(null);
  }, [wid]);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (
      selectedDocId &&
      documents.length > 0 &&
      !documents.find((d) => d.id === selectedDocId)
    ) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;
  const currentDocTitle = selectedDoc?.title ?? 'document';

  return {
    documents,
    selectedDocId,
    setSelectedDocId,
    selectedDoc,
    currentDocTitle,
  };
}