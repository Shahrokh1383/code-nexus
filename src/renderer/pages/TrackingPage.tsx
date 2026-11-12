import { type JSX } from 'react';
import { useTracking } from '../features/tracking/hooks/useTracking';
import { useDocuments } from '@renderer/features/documentation';
import { TrackingPageHeader } from '../features/tracking/components/TrackingPageHeader';
import { PendingDocumentList } from '../features/tracking/components/PendingDocumentList';
import { PendingChangesList } from '../features/tracking/components/PendingChangesList';
import { DiffViewer } from '../features/tracking/components/DiffViewer';
import { DocumentCommitPanel } from '../features/tracking/components/DocumentCommitPanel';
import '../shared/styles/tracking.css';

export function TrackingPage(): JSX.Element {
  const { documents } = useDocuments();
  const {
    selectedDocument, pendingChanges, commitHistory, selectedDiff,
    isLoading, error, pendingCountByDocId, searchQuery, selectedFilePath,
    isDiffModalOpen, setSearchQuery, setDiffModalOpen,
    selectDocument, approveCommit, fetchFileDiff, clearError,
  } = useTracking();

  const counts = Object.values(pendingCountByDocId);
  const pendingDocCount = counts.filter((c) => c > 0).length;
  const totalPendingFiles = counts.reduce((sum, c) => sum + c, 0);
  const isCacheMissing = selectedDiff === 'CACHE_MISSING';

  const handleSelectFile = (filePath: string): void => {
    void fetchFileDiff(filePath);
  };

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
          onClose={() => setDiffModalOpen(false)}
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