// src/presentation/components/documentation/DocumentCard.tsx
import type { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { OrphanBadge } from './OrphanBadge';

interface DocumentCardProps {
  document: DocumentDto;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps): JSX.Element {
  return (
    <div className={`document-card ${document.isOrphaned ? 'document-card--orphan' : ''}`}>
      <div className="document-card__header">
        <h3 className="document-card__title">{document.title}</h3>
        {document.isOrphaned && <OrphanBadge />}
      </div>
      
      <div className="document-card__meta">
        <span className="document-card__path" title={document.path}>
          <i className="fa-solid fa-file-lines" /> {document.path}
        </span>
        <span className="document-card__date">
          <i className="fa-regular fa-clock" /> {new Date(document.lastModified).toLocaleDateString()}
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