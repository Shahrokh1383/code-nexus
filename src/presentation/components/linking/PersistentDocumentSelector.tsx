import { JSX } from 'react';
import { useSearchableList } from '../../hooks/linking/useSearchableList';

interface DocumentOption {
  id: string;
  title: string;
}

interface PersistentDocumentSelectorProps {
  documents: DocumentOption[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
}

export function PersistentDocumentSelector({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: PersistentDocumentSelectorProps): JSX.Element {
  const {
    searchTerm,
    setSearchTerm,
    filteredItems,
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

  if (documents.length === 0) {
    return (
      <div className="p-3 text-center" style={{ color: 'var(--cn-text-secondary)' }}>
        <i className="fa-solid fa-triangle-exclamation me-2" />
        No documents found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="linking-sidebar__search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {searchTerm && (
          <button
            className="btn-ghost"
            style={{ position: 'absolute', right: 8, top: 5, padding: '2px 6px', fontSize: '0.8rem' }}
            onClick={clearSearch}
            title="Clear"
          >
            <i className="fa-solid fa-times" />
          </button>
        )}
      </div>

      <ul ref={listRef} className="linking-sidebar__list" style={{ flex: 1, overflowY: 'auto', padding: '0 var(--cn-space-2)' }}>
        {filteredItems.length === 0 ? (
          <li className="linking-sidebar__item" style={{ justifyContent: 'center', color: 'var(--cn-text-secondary)' }}>
            No matches
          </li>
        ) : (
          filteredItems.map((doc, index) => {
            const isSelected = doc.id === selectedDocumentId;
            const isFocused = index === focusedIndex;
            let className = 'linking-sidebar__item';
            if (isSelected) className += ' linking-sidebar__item--active';
            else if (isFocused) className += ' linking-sidebar__item--focused'; // we can add a subtle style

            return (
              <li
                key={doc.id}
                className={className}
                style={isFocused && !isSelected ? { backgroundColor: 'var(--cn-bg-hover)' } : undefined}
                onClick={() => handleSelect(doc.id)}
                role="option"
                aria-selected={isSelected}
              >
                <i className={`fa-solid fa-fw ${isSelected ? 'fa-circle-check' : 'fa-file-lines'}`} style={{ color: isSelected ? 'var(--cn-primary)' : 'var(--cn-text-secondary)' }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}