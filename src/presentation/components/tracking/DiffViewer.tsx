import type { JSX } from 'react';
import { ContentDiffDto } from '../../../domains/tracking/application/dto/content-diff.dto';

interface DiffViewerProps {
  diff: ContentDiffDto | null;
}

export function DiffViewer({ diff }: DiffViewerProps): JSX.Element {
  if (!diff) {
    return (
      <div className="diff-viewer diff-viewer--empty">
        <i className="fa-solid fa-code-compare diff-viewer__icon" />
        <p>Select a file to view changes</p>
      </div>
    );
  }

  const hasChanges =
    diff.addedLines.length > 0 ||
    diff.removedLines.length > 0 ||
    diff.modifiedLines.length > 0;

  if (!hasChanges) {
    return (
      <div className="diff-viewer diff-viewer--empty">
        <i className="fa-solid fa-check-circle diff-viewer__icon text-success" />
        <p>No changes detected</p>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="diff-viewer__header">
        <span className="diff-viewer__file-path">{diff.filePath}</span>
        <div className="diff-viewer__stats">
          {diff.addedLines.length > 0 && (
            <span className="diff-stat diff-stat--added">
              <i className="fa-solid fa-plus" /> {diff.addedLines.length}
            </span>
          )}
          {diff.removedLines.length > 0 && (
            <span className="diff-stat diff-stat--removed">
              <i className="fa-solid fa-minus" /> {diff.removedLines.length}
            </span>
          )}
          {diff.modifiedLines.length > 0 && (
            <span className="diff-stat diff-stat--modified">
              <i className="fa-solid fa-pen" /> {diff.modifiedLines.length}
            </span>
          )}
        </div>
      </div>

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
  );
}