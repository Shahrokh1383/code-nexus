import { JSX, useState, useEffect } from 'react';
import { useTracking } from '../hooks/useTracking';
import { useDocuments } from '../hooks/useDocuments';
import { TrackingPageHeader } from '../components/tracking/TrackingPageHeader';
import { PendingDocumentList } from '../components/tracking/PendingDocumentList';
import { PendingChangesList } from '../components/tracking/PendingChangesList';
import { DiffViewer } from '../components/tracking/DiffViewer';
import { DocumentCommitPanel } from '../components/tracking/DocumentCommitPanel';
import '../styles/tracking.css';

export function TrackingPage(): JSX.Element {
  const { documents } = useDocuments();
  const {
    selectedDocument,
    pendingChanges,
    commitHistory,
    selectedDiff,
    isLoading,
    error,
    pendingCountByDocId,
    selectDocument,
    approveCommit,
    fetchFileDiff,
    clearError,
    fetchAllPendingStatus,
    startRealtimeListener,
  } = useTracking();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  useEffect(() => {
    fetchAllPendingStatus();
    const unsubscribe = startRealtimeListener();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!selectedDocument && documents.length > 0) {
      const firstPendingDoc = documents.find(doc => (pendingCountByDocId[doc.id] || 0) > 0);
      if (firstPendingDoc) {
        selectDocument(firstPendingDoc);
      }
    }
  }, [documents, pendingCountByDocId, selectedDocument, selectDocument]);

  const counts: number[] = Object.values(pendingCountByDocId);
  const pendingDocCount = counts.filter(c => c > 0).length;
  const totalPendingFiles = counts.reduce((sum, c) => sum + c, 0);

  const handleSelectFile = (filePath: string) => {
    setSelectedFilePath(filePath);
    fetchFileDiff(filePath);
    setIsDiffModalOpen(true);
  };

  const handleCloseModal = () => setIsDiffModalOpen(false);

  const isCacheMissing = selectedDiff === 'CACHE_MISSING';

  return (
    <div className="tracking-page">
      <TrackingPageHeader
        pendingDocCount={pendingDocCount}
        totalPendingFiles={totalPendingFiles}
      />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={clearError} aria-label="Close"></button>
        </div>
      )}

      {isCacheMissing && (
        <div className="alert alert-warning" role="alert">
          <i className="fa-solid fa-triangle-exclamation me-2"></i>
          Baseline cache is missing for this file. Please review and re-commit to establish a new baseline.
        </div>
      )}

      <div className="tracking-content">
        <div className="tracking-content__left">
          <PendingDocumentList
            documents={documents}
            pendingCountByDocId={pendingCountByDocId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDocumentId={selectedDocument?.id ?? null}
            onSelectDocument={selectDocument}
          />

          {selectedDocument && (
            <PendingChangesList
              changes={pendingChanges}
              selectedFilePath={selectedFilePath}
              onSelectFile={handleSelectFile}
            />
          )}
        </div>

        <div className="tracking-content__right">
          {selectedDocument && (
            <DocumentCommitPanel
              documentId={selectedDocument.id}
              pendingCount={pendingChanges.length}
              commitHistory={commitHistory}
              isLoading={isLoading}
              onApprove={approveCommit}
            />
          )}
        </div>
      </div>

      {selectedDiff && selectedDiff !== 'CACHE_MISSING' && (
        <DiffViewer
          diff={selectedDiff}
          show={isDiffModalOpen}
          onClose={handleCloseModal}
        />
      )}

      {isLoading && (
        <div className="tracking-loading">
          <i className="fa-solid fa-spinner fa-spin" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}