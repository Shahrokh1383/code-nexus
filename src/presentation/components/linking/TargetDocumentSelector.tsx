import { JSX, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';

interface TargetDocumentSelectorProps {
  documents: DocumentDto[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
}

export function TargetDocumentSelector({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: TargetDocumentSelectorProps): JSX.Element {
  // ---- state ----
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ---- derived ----
  const selectedDocument = documents.find(d => d.id === selectedDocumentId) ?? null;

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const lower = searchTerm.toLowerCase();
    return documents.filter(d => d.title.toLowerCase().includes(lower));
  }, [documents, searchTerm]);

  // reset focus when search changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm]);

  // ---- handlers ----
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
      if (filteredDocuments.length === 0) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % filteredDocuments.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + filteredDocuments.length) % filteredDocuments.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredDocuments[focusedIndex]) {
            handleSelect(filteredDocuments[focusedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSearchTerm('');
          inputRef.current?.blur();
          break;
      }
    },
    [filteredDocuments, focusedIndex, handleSelect]
  );

  // keep focused item visible in scroll
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[focusedIndex] as HTMLLIElement | undefined;
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // ---- edge case: no documents at all ----
  if (documents.length === 0) {
    return (
      <div className="mb-3 p-3 bg-warning-subtle rounded">
        <i className="fa-solid fa-triangle-exclamation me-2"></i>
        No documents registered. Please configure a documentation folder first.
      </div>
    );
  }

  return (
    <div className="mb-3 target-doc-selector">
      {/* --- currently selected indicator --- */}
      {selectedDocument && (
        <div className="mb-2 d-flex align-items-center gap-2">
          <span className="text-secondary fw-medium" style={{ fontSize: 'var(--cn-font-size-sm)' }}>
            Linking to:
          </span>
          <span
            className="badge d-inline-flex align-items-center gap-1"
            style={{
              backgroundColor: 'var(--cn-primary-muted)',
              color: 'var(--cn-primary)',
              fontSize: 'var(--cn-font-size-sm)',
              fontWeight: 'var(--cn-font-weight-semibold)',
              padding: '0.35em 0.65em',
            }}
          >
            <i className="fa-solid fa-file-lines fa-fw" />
            {selectedDocument.title}
          </span>
        </div>
      )}

      {/* --- search input --- */}
      <div className="input-group input-group-sm mb-2">
        <span className="input-group-text" style={{ backgroundColor: 'var(--cn-bg-secondary)', borderColor: 'var(--cn-border-default)' }}>
          <i className="fa-solid fa-magnifying-glass text-secondary" />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            backgroundColor: 'var(--cn-bg-secondary)',
            borderColor: 'var(--cn-border-default)',
            color: 'var(--cn-text-primary)',
          }}
        />
        {searchTerm && (
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }}
            style={{ borderColor: 'var(--cn-border-default)' }}
            title="Clear search"
          >
            <i className="fa-solid fa-times" />
          </button>
        )}
      </div>

      {/* --- document list --- */}
      <ul
        ref={listRef}
        className="list-unstyled m-0 target-doc-list"
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          border: '1px solid var(--cn-border-light)',
          borderRadius: 'var(--cn-radius-md)',
          backgroundColor: 'var(--cn-bg-secondary)',
          padding: '4px',
        }}
      >
        {filteredDocuments.length === 0 ? (
          <li className="p-3 text-center text-secondary" style={{ fontSize: 'var(--cn-font-size-sm)' }}>
            No documents match your search.
          </li>
        ) : (
          filteredDocuments.map((doc, index) => {
            const isSelected = doc.id === selectedDocumentId;
            const isFocused = index === focusedIndex;
            return (
              <li
                key={doc.id}
                className={`d-flex align-items-center gap-2 py-2 px-3 rounded ${
                  isSelected ? 'fw-semibold' : ''
                }`}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected
                    ? 'var(--cn-primary-muted)'
                    : isFocused
                    ? 'var(--cn-bg-hover)'
                    : 'transparent',
                  color: isSelected ? 'var(--cn-primary)' : 'var(--cn-text-primary)',
                  transition: 'background-color 0.1s ease',
                }}
                onClick={() => handleSelect(doc.id)}
                onMouseEnter={() => setFocusedIndex(index)}
                role="option"
                aria-selected={isSelected}
              >
                <i
                  className={`fa-solid ${isSelected ? 'fa-circle-check text-primary' : 'fa-file-lines text-secondary'}`}
                  style={{ width: '1.2em' }}
                />
                <span>{doc.title}</span>
                {isSelected && (
                  <span className="ms-auto" style={{ fontSize: 'var(--cn-font-size-xs)', color: 'var(--cn-text-disabled)' }}>
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