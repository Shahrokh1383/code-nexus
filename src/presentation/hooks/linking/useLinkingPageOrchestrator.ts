import { useState, useEffect } from 'react';
import { useDocuments } from '../useDocuments';
import { useFileTree } from '../useFileTree';
import { useLinks } from './useLinks';

export function useLinkingPageOrchestrator() {
  const { documents } = useDocuments();
  const { scanProject, isScanning, tree } = useFileTree();
  const { fetchLinksForDocument, fetchGraphData } = useLinks();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  // If the selected document was deleted, pick a new one
  useEffect(() => {
    if (selectedDocId && documents.length > 0 && !documents.find(d => d.id === selectedDocId)) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (selectedDocId) fetchLinksForDocument(selectedDocId);
  }, [selectedDocId, fetchLinksForDocument]);

  useEffect(() => {
    if (!tree && !isScanning) {
      scanProject();
    }
  }, [tree, isScanning, scanProject]);

  useEffect(() => {
    if (tree && !isScanning) {
      fetchGraphData();
    }
  }, [tree, isScanning, fetchGraphData]);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || null;
  const currentDocTitle = selectedDoc?.title ?? 'document';

  return {
    documents,
    selectedDocId,
    setSelectedDocId,
    selectedDoc,
    currentDocTitle,
  };
}