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
      <div className="document-selector__empty">
        <i className="fa-solid fa-triangle-exclamation" />
        <span>No documents found</span>
      </div>
    );
  }

  return (
    <div className="document-selector">
      <div className="document-selector__search">
        <i className="fa-solid fa-search document-selector__search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="document-selector__input"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search documents"
        />
        {searchTerm && (
          <button
            type="button"
            className="document-selector__clear-btn"
            onClick={clearSearch}
            aria-label="Clear search"
            title="Clear search"
          >
            <i className="fa-solid fa-times" />
          </button>
        )}
      </div>

      <ul 
        ref={listRef} 
        className="document-selector__list" 
        role="listbox"
        aria-label="Documents list"
      >
        {filteredItems.length === 0 ? (
          <li className="document-selector__no-results">
            <span>No matches found</span>
          </li>
        ) : (
          filteredItems.map((doc, index) => {
            const isSelected = doc.id === selectedDocumentId;
            const isFocused = index === focusedIndex;
            
            return (
              <li
                key={doc.id}
                className={`document-selector__item ${isSelected ? 'document-selector__item--active' : ''} ${isFocused && !isSelected ? 'document-selector__item--focused' : ''}`}
                onClick={() => handleSelect(doc.id)}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
              >
                <i 
                  className={`fa-solid fa-fw document-selector__icon ${isSelected ? 'document-selector__icon--active' : ''}`} 
                />
                <span className="document-selector__title">{doc.title}</span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}