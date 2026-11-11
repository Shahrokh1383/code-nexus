import { JSX, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SearchBar } from './SearchBar';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const lower = searchTerm.toLowerCase();
    return documents.filter((doc) => doc.title.toLowerCase().includes(lower));
  }, [documents, searchTerm]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelectDocument(id);
      setSearchTerm('');
      inputRef.current?.blur();
    },
    [onSelectDocument]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredItems.length === 0) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % filteredItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(
            (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[focusedIndex]) handleSelect(filteredItems[focusedIndex].id);
          break;
        case 'Escape':
          e.preventDefault();
          setSearchTerm('');
          inputRef.current?.blur();
          break;
      }
    },
    [filteredItems, focusedIndex, handleSelect]
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[focusedIndex] as HTMLLIElement | undefined;
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedIndex]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, []);

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
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search documents..."
        onClear={clearSearch}
        onKeyDown={handleKeyDown}
        aria-label="Search documents"
        inputRef={inputRef}
      />
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