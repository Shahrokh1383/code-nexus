import { JSX } from 'react';
import { useSearchableList } from '../../hooks/linking/useSearchableList';
import './TargetDocumentSelector.css';

interface DocumentOption {
  id: string;
  title: string;
}

interface TargetDocumentSelectorProps {
  documents: DocumentOption[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
}

export function TargetDocumentSelector({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: TargetDocumentSelectorProps): JSX.Element {
  const {
    searchTerm,
    setSearchTerm,
    filteredItems: filteredDocuments,
    focusedIndex,
    inputRef,
    listRef,
    handleKeyDown,
    handleSelect,
    clearSearch,
  } = useSearchableList<DocumentOption>({
    items: documents,
    getId: (doc) => doc.id,
    getSearchText: (doc) => doc.title,
    onSelect: onSelectDocument,
  });

  const selectedDocument = documents.find(d => d.id === selectedDocumentId) ?? null;

  if (documents.length === 0) {
    return (
      <div className="mb-3 p-3 bg-warning-subtle rounded">
        <i className="fa-solid fa-triangle-exclamation me-2"></i>
        No documents registered. Please configure a documentation folder first.
      </div>
    );
  }

  return (
    <div className="target-doc-selector">
      {selectedDocument && (
        <div className="mb-2 d-flex align-items-center gap-2">
          <span className="text-secondary fw-medium" style={{ fontSize: 'var(--cn-font-size-sm)' }}>
            Linking to:
          </span>
          <span className="badge target-doc-badge">
            <i className="fa-solid fa-file-lines fa-fw" />
            {selectedDocument.title}
          </span>
        </div>
      )}

      <div className="input-group input-group-sm mb-2 target-doc-input-group">
        <span className="input-group-text">
          <i className="fa-solid fa-magnifying-glass text-secondary" />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="form-control target-doc-input"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchTerm && (
          <button
            className="btn btn-outline-secondary btn-sm target-doc-clear-btn"
            type="button"
            onClick={clearSearch}
            title="Clear search"
          >
            <i className="fa-solid fa-times" />
          </button>
        )}
      </div>

      <ul ref={listRef} className="target-doc-list">
        {filteredDocuments.length === 0 ? (
          <li className="target-doc-empty">
            No documents match your search.
          </li>
        ) : (
          filteredDocuments.map((doc, index) => {
            const isSelected = doc.id === selectedDocumentId;
            const isFocused = index === focusedIndex;
            
            let itemClass = 'target-doc-item';
            if (isSelected) itemClass += ' selected';
            else if (isFocused) itemClass += ' focused';

            return (
              <li
                key={doc.id}
                className={itemClass}
                onClick={() => handleSelect(doc.id)}
                role="option"
                aria-selected={isSelected}
              >
                <i
                  className={`fa-solid target-doc-item-icon ${isSelected ? 'fa-circle-check text-primary' : 'fa-file-lines text-secondary'}`}
                />
                <span>{doc.title}</span>
                {isSelected && (
                  <span className="target-doc-active-label">
                    active
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}