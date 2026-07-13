import { JSX } from 'react';
import { CodeFileSummaryDto } from '../../../domains/linking/application/dto/link.dto';

interface UnlinkedFilesListProps {
  files: CodeFileSummaryDto[];
  onLink: (fileId: string) => void;
}

export function UnlinkedFilesList({ files, onLink }: UnlinkedFilesListProps): JSX.Element {
  if (files.length === 0) {
    return (
      <div className="text-center p-5 text-secondary">
        <i className="fa-solid fa-check-circle fa-2x mb-3 text-success"></i>
        <p>All code files are linked to documentation!</p>
      </div>
    );
  }

  return (
    <div className="list-group list-group-flush">
      {files.map(file => (
        <div key={file.id} className="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 py-3">
          <div>
            <i className="fa-solid fa-file-code text-warning me-2"></i>
            <span className="fw-medium">{file.name}</span>
            <div className="text-secondary" style={{ fontSize: 'var(--cn-font-size-xs)' }}>{file.path}</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => onLink(file.id)}>
            <i className="fa-solid fa-link me-1"></i> Link
          </button>
        </div>
      ))}
    </div>
  );
}