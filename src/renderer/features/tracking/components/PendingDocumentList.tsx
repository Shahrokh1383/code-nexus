import type { JSX } from 'react';
import type { DocumentDto } from '@shared/ipc/documentation';

interface PendingDocumentListProps {
  documents: readonly DocumentDto[];
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
  let pendingDocs = documents.filter((doc) => (pendingCountByDocId[doc.id] || 0) > 0);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    pendingDocs = pendingDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) || doc.path.toLowerCase().includes(q),
    );
  }

  pendingDocs.sort(
    (a, b) => (pendingCountByDocId[b.id] || 0) - (pendingCountByDocId[a.id] || 0),
  );

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
        {pendingDocs.length > 0 && (
          <span
            className="document-list__count"
            aria-label={`${pendingDocs.length} pending documents`}
          >
            {pendingDocs.length}
          </span>
        )}
      </div>

      <div className="search-bar">
        <i className="fa-solid fa-search search-bar__icon" />
        <input
          type="text"
          className="search-bar__input"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search pending documents"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-bar__clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            title="Clear search"
          >
            <i className="fa-solid fa-times" />
          </button>
        )}
      </div>

      {pendingDocs.length === 0 && searchQuery ? (
        <div className="document-list__empty-message">
          <p>No documents match your search.</p>
        </div>
      ) : (
        <div className="document-list__items">
          {pendingDocs.map((doc) => {
            const count = pendingCountByDocId[doc.id] || 0;
            const isSelected = selectedDocumentId === doc.id;
            return (
              <div
                key={doc.id}
                className={`document-card ${isSelected ? 'document-card--selected' : ''}`}
                onClick={() => onSelectDocument(doc)}
                role="button"
                tabIndex={0}
                aria-current={isSelected ? 'true' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDocument(doc);
                  }
                }}
              >
                <span className="document-card__avatar" aria-hidden="true">
                  <i className="fa-solid fa-file-lines" />
                </span>
                <div className="document-card__info">
                  <span className="document-card__name">{doc.title}</span>
                  <span className="document-card__path">{doc.path}</span>
                </div>
                <span
                  className="document-card__badge"
                  title={`${count} pending changes`}
                >
                  {count}
                </span>
                <i
                  className="fa-solid fa-chevron-right document-card__chevron"
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}