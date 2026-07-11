import type { JSX } from 'react';
import { FileHashDto } from '../../../domains/tracking/application/dto/file-hash.dto';

interface PendingChangesListProps {
  changes: FileHashDto[];
  selectedFilePath: string | null;
  onSelectFile: (filePath: string) => void;
}

export function PendingChangesList({ changes, selectedFilePath, onSelectFile }: PendingChangesListProps): JSX.Element {
  if (changes.length === 0) {
    return (
      <div className="pending-changes pending-changes--empty">
        <i className="fa-solid fa-check-circle pending-changes__icon text-success" />
        <p>All files are up to date</p>
        <span className="pending-changes__hint">
          No pending changes detected in the workspace
        </span>
      </div>
    );
  }

  return (
    <div className="pending-changes">
      <h3 className="pending-changes__title">
        <i className="fa-solid fa-triangle-exclamation text-warning" /> Pending Changes
        <span className="pending-changes__count">{changes.length}</span>
      </h3>
      <div className="pending-changes__list">
        {changes.map((change) => (
          <div
            key={change.filePath}
            className={`pending-file ${selectedFilePath === change.filePath ? 'pending-file--selected' : ''}`}
            onClick={() => onSelectFile(change.filePath)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectFile(change.filePath)}
          >
            <div className="pending-file__header">
              <i className="fa-solid fa-file-code pending-file__icon" />
              <span className="pending-file__path">{change.filePath}</span>
            </div>
            <div className="pending-file__meta">
              <span className="pending-file__hash" title={change.hashValue}>
                <i className="fa-solid fa-fingerprint" /> {change.hashValue.slice(0, 8)}...
              </span>
              <span className={`pending-file__status pending-file__status--${change.status.toLowerCase()}`}>
                {change.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}