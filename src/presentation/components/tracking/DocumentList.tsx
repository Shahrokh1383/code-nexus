import { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';

interface DocumentListProps {
  documents: DocumentDto[];
  pendingCounts: Record<string, number>;
  selectedDocumentId: string | null;
  onSelectDocument: (doc: DocumentDto) => void;
}

export function DocumentList({
  documents,
  pendingCounts,
  selectedDocumentId,
  onSelectDocument,
}: DocumentListProps): JSX.Element {
  if (documents.length === 0) {
    return (
      <div className="document-list document-list--empty">
        <i className="fa-solid fa-file-lines document-list__icon" />
        <p>No documents found</p>
        <span className="document-list__hint">
          Register a docs folder to start tracking
        </span>
      </div>
    );
  }

  return (
    <div className="document-list">
      <h3 className="document-list__title">
        <i className="fa-solid fa-book-open" /> Documents
      </h3>
      <div className="document-list__items">
        {documents.map((doc) => {
          const count = pendingCounts[doc.id] || 0;
          return (
            <div
              key={doc.id}
              className={`document-card ${selectedDocumentId === doc.id ? 'document-card--selected' : ''}`}
              onClick={() => onSelectDocument(doc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectDocument(doc)}
            >
              <div className="document-card__info">
                <span className="document-card__name">{doc.title}</span>
                <span className="document-card__path">{doc.path}</span>
              </div>
              {count > 0 && (
                <span className="document-card__badge">{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}