import type { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { OrphanBadge } from './OrphanBadge';

interface DocumentCardProps {
  document: DocumentDto;
  onDelete: (id: string) => void;
}

function truncatePath(path: string): string {
  const segments = path.split('/');
  if (segments.length <= 3) return path;
  return segments[0] + '/' + segments[1] + '/…/' + segments[segments.length - 1];
}

export function DocumentCard({ document, onDelete }: DocumentCardProps): JSX.Element {
  const displayPath = truncatePath(document.path);

  return (
    <div className={`document-card ${document.isOrphaned ? 'document-card--orphan' : ''}`}>
      <div className="document-card__header">
        <h3 className="document-card__title">{document.title}</h3>
        {document.isOrphaned && <OrphanBadge />}
      </div>
      
      <div className="document-card__meta">
        <span className="document-card__path" title={document.path}>
          <i className="fa-solid fa-file-lines" />
          <span className="document-card__path-text">{displayPath}</span>
        </span>
        <span className="document-card__date">
          <i className="fa-regular fa-clock" />
          <span>{new Date(document.lastModified).toLocaleDateString()}</span>
        </span>
      </div>

      <div className="document-card__footer">
        <span className={`pill ${document.linkCount > 0 ? 'pill-success' : 'pill-secondary'}`}>
          <i className="fa-solid fa-link" /> {document.linkCount} Links
        </span>
        <button className="btn-icon btn-danger" onClick={() => onDelete(document.id)} title="Delete">
          <i className="fa-solid fa-trash-can" />
        </button>
      </div>
    </div>
  );
}