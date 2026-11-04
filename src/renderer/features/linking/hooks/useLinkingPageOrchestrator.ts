import { useEffect } from 'react';
import { useDocuments } from '../../documentation';
import { useFileTree } from '../../filesystem';
import { useWorkspace } from '../../workspace';
import { useLinks } from './useLinks';
import { setSelectedDocId, useSelectedDocId } from '../stores/selectedDocument';

export function useLinkingPageOrchestrator() {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const { documents } = useDocuments();
  const { tree, isScanning } = useFileTree();
  const { fetchLinksForDocument, fetchGraphData } = useLinks();
  const selectedDocId = useSelectedDocId();

  // Workspace switch → clear selection (matches React remount of legacy page).
  useEffect(() => {
    setSelectedDocId(null);
  }, [wid]);

  // Auto-select first document when none selected and documents exist.
  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Fallback to first document if the current one disappears.
  useEffect(() => {
    if (
      selectedDocId &&
      documents.length > 0 &&
      !documents.find((d) => d.id === selectedDocId)
    ) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // Refetch doc-specific links on selection change.
  useEffect(() => {
    if (selectedDocId) fetchLinksForDocument(selectedDocId);
  }, [selectedDocId, fetchLinksForDocument]);

  // Gate unlinked-files refetch on tree readiness (legacy behavior — see R24).
  useEffect(() => {
    if (tree && !isScanning) {
      fetchGraphData();
    }
  }, [tree, isScanning, fetchGraphData]);

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