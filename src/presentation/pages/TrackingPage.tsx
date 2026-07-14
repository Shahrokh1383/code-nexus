import { JSX, useState, useEffect } from 'react';
import { useTracking } from '../hooks/useTracking';
import { useDocuments } from '../hooks/useDocuments';
import { TrackingPageHeader } from '../components/tracking/TrackingPageHeader';
import { DocumentList } from '../components/tracking/DocumentList';
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
    selectDocument,
    approveCommit,
    fetchFileDiff,
    clearError,
  } = useTracking();

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedDocument) {
      setPendingCounts((prev) => ({
        ...prev,
        [selectedDocument.id]: pendingChanges.length,
      }));
    } else {
      setPendingCounts({});
    }
  }, [pendingChanges, selectedDocument]);

  useEffect(() => {
    if (!selectedDocument && documents.length > 0) {
      selectDocument(documents[0]);
    }
  }, [documents, selectedDocument, selectDocument]);

  // When a file is selected in the list, fetch its diff and open modal
  const handleSelectFile = (filePath: string) => {
    setSelectedFilePath(filePath);
    fetchFileDiff(filePath);
    setIsDiffModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDiffModalOpen(false);
  };

  return (
    <div className="tracking-page">
      <TrackingPageHeader
        pendingCount={pendingChanges.length}
        commitCount={commitHistory.length}
      />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={clearError} aria-label="Close"></button>
        </div>
      )}

      <div className="tracking-content">
        <div className="tracking-content__left">
          <DocumentList
            documents={documents}
            pendingCounts={pendingCounts}
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

      {/* Full-screen diff modal */}
      <DiffViewer
        diff={selectedDiff}
        show={isDiffModalOpen}
        onClose={handleCloseModal}
      />

      {isLoading && (
        <div className="tracking-loading">
          <i className="fa-solid fa-spinner fa-spin" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}