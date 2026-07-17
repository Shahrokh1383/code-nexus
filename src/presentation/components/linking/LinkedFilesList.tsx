import { JSX } from 'react';
import { CodeToDocLinkDto } from '../../../domains/linking/application/dto/link.dto';

interface LinkedFilesListProps {
  documentTitle: string;
  codeLinks: CodeToDocLinkDto[];
  onRemoveLink: (linkId: string, documentId: string) => void;
}

export function LinkedFilesList({ documentTitle, codeLinks, onRemoveLink }: LinkedFilesListProps): JSX.Element {
  if (codeLinks.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100" style={{ color: 'var(--cn-text-secondary)' }}>
        <div className="text-center">
          <i className="fa-solid fa-link fa-3x mb-3" style={{ color: 'var(--cn-text-disabled)' }} />
          <p>No code files linked to this document yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="linked-files-list-container">
      <div className="linked-files-list__header">
        <i className="fa-solid fa-file-lines me-2" />
        <span className="fw-medium">{documentTitle}</span>
      </div>
      <ul className="linked-files-list">
        {codeLinks.map((link) => (
          <li key={link.id} className="linked-files-list__item">
            <div className="linked-files-list__info">
              <div className="linked-files-list__name">{link.codeFileName}</div>
              <div className="linked-files-list__path">{link.codeFilePath}</div>
            </div>
            <span className={`linked-files-list__type-badge ${link.type === 'INHERITED' ? 'linked-files-list__type-badge--inherited' : ''}`}>
              {link.type}
            </span>
            <button
              className="linked-files-list__remove-btn"
              title="Remove link"
              aria-label={`Remove link to ${link.codeFileName}`}
              onClick={() => onRemoveLink(link.id, link.documentId)}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}