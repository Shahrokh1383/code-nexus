import type { JSX } from 'react';
import { useState } from 'react';
import { useTracking } from '../hooks/useTracking';
import { TrackingPageHeader } from '../components/tracking/TrackingPageHeader';
import { PendingChangesList } from '../components/tracking/PendingChangesList';
import { DiffViewer } from '../components/tracking/DiffViewer';
import { CommitButton } from '../components/tracking/CommitButton';
import { CommitHistory } from '../components/tracking/CommitHistory';
import '../styles/tracking.css';

export function TrackingPage(): JSX.Element {
  const {
    pendingChanges,
    commitHistory,
    isLoading,
    error,
    approveCommit,
    fetchCommitHistory,
    clearError,
  } = useTracking();

  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Mock diff data for selected file (will be replaced with real diff query in future)
  const selectedDiff = null; // TODO: fetch diff via IPC when diff query is available

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
          <PendingChangesList
            changes={pendingChanges}
            selectedFilePath={selectedFilePath}
            onSelectFile={setSelectedFilePath}
          />

          {selectedFilePath && (
            <div className="tracking-diff-section">
              <DiffViewer diff={selectedDiff} />
            </div>
          )}
        </div>

        <div className="tracking-content__right">
          <div className="tracking-actions">
            <CommitButton
              documentId="default"
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