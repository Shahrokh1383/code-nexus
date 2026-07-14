import type { JSX } from 'react';
import { ContentDiffDto } from '../../../domains/tracking/application/dto/content-diff.dto';

interface DiffViewerProps {
  diff: ContentDiffDto | null;
  show: boolean;
  onClose: () => void;
}

export function DiffViewer({ diff, show, onClose }: DiffViewerProps): JSX.Element {
  if (!show) return <></>;

  const hasChanges = diff
    ? diff.addedLines.length > 0 || diff.removedLines.length > 0 || diff.modifiedLines.length > 0
    : false;

  const backdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="diff-modal-backdrop" onClick={backdropClick}>
      <div className="diff-modal">
        <div className="diff-modal__header">
          <span className="diff-modal__file-path">
            {diff ? diff.filePath : 'File Diff'}
          </span>
          <button className="diff-modal__close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-times" />
          </button>
        </div>
        <div className="diff-modal__body">
          {!diff && (
            <div className="diff-viewer--empty">
              <i className="fa-solid fa-code-compare diff-viewer__icon" />
              <p>Select a file to view changes</p>
            </div>
          )}
          {diff && !hasChanges && (
            <div className="diff-viewer--empty">
              <i className="fa-solid fa-check-circle diff-viewer__icon text-success" />
              <p>No changes detected</p>
            </div>
          )}
          {diff && hasChanges && (
            <div className="diff-viewer">
              <div className="diff-viewer__content">
                {diff.removedLines.map((line, idx) => (
                  <div key={`removed-${idx}`} className="diff-line diff-line--removed">
                    <span className="diff-line__number">{line.lineNumber}</span>
                    <span className="diff-line__marker">-</span>
                    <span className="diff-line__content">{line.content}</span>
                  </div>
                ))}
                {diff.addedLines.map((line, idx) => (
                  <div key={`added-${idx}`} className="diff-line diff-line--added">
                    <span className="diff-line__number">{line.lineNumber}</span>
                    <span className="diff-line__marker">+</span>
                    <span className="diff-line__content">{line.content}</span>
                  </div>
                ))}
                {diff.modifiedLines.map((line, idx) => (
                  <div key={`modified-${idx}`} className="diff-line diff-line--modified">
                    <span className="diff-line__number">{line.lineNumber}</span>
                    <span className="diff-line__marker">~</span>
                    <span className="diff-line__content">{line.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}