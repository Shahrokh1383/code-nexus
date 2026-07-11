import type { JSX } from 'react';
import { GranularCommitDto } from '../../../domains/tracking/application/dto/granular-commit.dto';

interface CommitHistoryProps {
  commits: GranularCommitDto[];
}

export function CommitHistory({ commits }: CommitHistoryProps): JSX.Element {
  if (commits.length === 0) {
    return (
      <div className="commit-history commit-history--empty">
        <i className="fa-solid fa-clock-rotate-left commit-history__icon" />
        <p>No commits yet</p>
        <span className="commit-history__hint">
          Approved commits will appear here
        </span>
      </div>
    );
  }

  return (
    <div className="commit-history">
      <h3 className="commit-history__title">
        <i className="fa-solid fa-code-commit" /> Commit History
      </h3>
      <div className="commit-history__list">
        {commits.map((commit) => (
          <div key={commit.id} className="commit-card">
            <div className="commit-card__header">
              <span className="commit-card__id">
                <i className="fa-solid fa-fingerprint" /> {commit.id.slice(0, 8)}
              </span>
              <span className={`commit-card__status commit-card__status--${commit.status.toLowerCase()}`}>
                {commit.status}
              </span>
            </div>
            <div className="commit-card__meta">
              <span className="commit-card__time">
                <i className="fa-regular fa-clock" />{' '}
                {new Date(commit.committedAt).toLocaleString()}
              </span>
              <span className="commit-card__files">
                <i className="fa-solid fa-file-code" /> {commit.filePaths.length} files
              </span>
            </div>
            <div className="commit-card__files-list">
              {commit.filePaths.slice(0, 3).map((fp, idx) => (
                <span key={idx} className="commit-card__file-path">{fp}</span>
              ))}
              {commit.filePaths.length > 3 && (
                <span className="commit-card__more">
                  +{commit.filePaths.length - 3} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}