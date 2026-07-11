import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { useTracking } from '../hooks/useTracking';
import { useDocuments } from '../hooks/useDocuments';
import { TrackingPageHeader } from '../components/tracking/TrackingPageHeader';
import { PendingChangesList } from '../components/tracking/PendingChangesList';
import { DiffViewer } from '../components/tracking/DiffViewer';
import { CommitButton } from '../components/tracking/CommitButton';
import { CommitHistory } from '../components/tracking/CommitHistory';
import '../styles/tracking.css';

export function TrackingPage(): JSX.Element {
  const { documents } = useDocuments();
  const {
    selectedDocumentId,
    pendingChanges,
    commitHistory,
    selectedDiff,
    isLoading,
    error,
    setSelectedDocument,
    approveCommit,
    fetchFileDiff,
    clearError,
  } = useTracking();

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Auto‑select first document if none is selected and documents exist
  useEffect(() => {
    if (!selectedDocumentId && documents.length > 0) {
      setSelectedDocument(documents[0].id);
    }
  }, [documents, selectedDocumentId, setSelectedDocument]);

  // Load diff when a file is selected
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

      {/* Document Selector for Granular Commits */}
      <div className="tracking-document-selector mb-3 p-2 bg-light border rounded">
        <label className="form-label fw-bold me-2">Reviewing Document:</label>
        <select
          className="form-select form-select-sm d-inline-block w-auto"
          value={selectedDocumentId || ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setSelectedDocument(id);
            setSelectedFilePath(null); // reset file selection on document change
          }}
        >
          <option value="">-- Select a document --</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title || doc.path}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={clearError} aria-label="Close"></button>
        </div>
      )}

      <div className="tracking-content">
        <div className="tracking-content__left">
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
        </div>

        <div className="tracking-content__right">
          <div className="tracking-actions mb-3">
            <CommitButton
              documentId={selectedDocumentId}
              pendingCount={pendingChanges.length}
              onApprove={approveCommit}
              isLoading={isLoading}
            />
          </div>

          <CommitHistory commits={commitHistory} />
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