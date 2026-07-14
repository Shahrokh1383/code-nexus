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

  // Compute pending counts per document by counting pendingChanges' linked files
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // pendingChanges contains entries only for the selected document (filtered by store)
    // But we need counts per document across all documents. The current design only loads
    // pending changes for the selected document. To show badges on the document list,
    // we must either prefetch counts for all documents or derive from full tracking index.
    // For now, we set the selected document's count from pendingChanges length.
    if (selectedDocument) {
      setPendingCounts((prev) => ({
        ...prev,
        [selectedDocument.id]: pendingChanges.length,
      }));
    } else {
      setPendingCounts({});
    }
  }, [pendingChanges, selectedDocument]);

  // Auto-select first document if none selected
  useEffect(() => {
    if (!selectedDocument && documents.length > 0) {
      selectDocument(documents[0]);
    }
  }, [documents, selectedDocument, selectDocument]);

  // Load diff when file selected
  useEffect(() => {
    if (selectedFilePath) {
      fetchFileDiff(selectedFilePath);
    }
  }, [selectedFilePath, fetchFileDiff]);

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
            <>
              <PendingChangesList
                changes={pendingChanges}
                selectedFilePath={selectedFilePath}
                onSelectFile={setSelectedFilePath}
              />

              {selectedFilePath && (
                <div className="tracking-diff-section mt-3">
                  <DiffViewer diff={selectedDiff} />
                </div>
              )}
            </>
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

      {isLoading && (
        <div className="tracking-loading">
          <i className="fa-solid fa-spinner fa-spin" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}