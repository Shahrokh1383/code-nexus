import { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { SearchBar } from '../common/SearchBar';

interface PendingDocumentListProps {
  documents: DocumentDto[];
  pendingCountByDocId: Record<string, number>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDocumentId: string | null;
  onSelectDocument: (doc: DocumentDto) => void;
}

export function PendingDocumentList({
  documents,
  pendingCountByDocId,
  searchQuery,
  onSearchChange,
  selectedDocumentId,
  onSelectDocument,
}: PendingDocumentListProps): JSX.Element {
  // 1. Only documents with pending changes
  let pendingDocs = documents.filter(doc => (pendingCountByDocId[doc.id] || 0) > 0);

  // 2. Apply search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    pendingDocs = pendingDocs.filter(doc =>
      doc.title.toLowerCase().includes(q) || doc.path.toLowerCase().includes(q)
    );
  }

  // 3. Sort by pending count descending
  pendingDocs.sort((a, b) => (pendingCountByDocId[b.id] || 0) - (pendingCountByDocId[a.id] || 0));

  if (pendingDocs.length === 0 && !searchQuery) {
    return (
      <div className="document-list document-list--empty">
        <i className="fa-solid fa-check-circle document-list__icon text-success" />
        <p>All documents are up to date</p>
        <span className="document-list__hint">
          Pending documents will appear here when files change.
        </span>
      </div>
    );
  }

  return (
    <div className="document-list">
      <div className="document-list__header">
        <h3 className="document-list__title">
          <i className="fa-solid fa-book-open" /> Pending Documents
        </h3>
      </div>
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search documents..."
        aria-label="Search pending documents"
        onClear={() => onSearchChange('')}
      />
      {pendingDocs.length === 0 && searchQuery ? (
        <div className="document-list--empty" style={{ padding: '1.5rem' }}>
          <p>No documents match your search.</p>
        </div>
      ) : (
        <div className="document-list__items">
          {pendingDocs.map((doc) => {
            const count = pendingCountByDocId[doc.id] || 0;
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
      )}
    </div>
  );
}