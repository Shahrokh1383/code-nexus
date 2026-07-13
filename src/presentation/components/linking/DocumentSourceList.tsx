import { JSX } from 'react';

interface DocumentOption {
  id: string;
  title: string;
}

interface DocumentSourceListProps {
  documents: DocumentOption[];
  selectedIds: Set<string>;
  onToggleDocument: (id: string) => void;
  onSelectAll: () => void;
}

export function DocumentSourceList({
  documents,
  selectedIds,
  onToggleDocument,
  onSelectAll,
}: DocumentSourceListProps): JSX.Element {
  const isAllSelected = documents.length > 0 && selectedIds.size === documents.length;

  return (
    <div className="file-picker-tree" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
      <div className="tree-actions mb-2">
        <button className="btn btn-sm btn-ghost" onClick={onSelectAll}>
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      {documents.length === 0 ? (
        <p className="text-secondary p-3 text-center">No other documents available.</p>
      ) : (
        documents.map(doc => {
          const isChecked = selectedIds.has(doc.id);
          return (
            <label
              key={doc.id}
              className="d-flex align-items-center py-2 px-2 rounded hover-bg"
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cn-bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={isChecked}
                onChange={() => onToggleDocument(doc.id)}
              />
              <i className="fa-solid fa-file-lines text-primary me-2"></i>
              <span>{doc.title}</span>
            </label>
          );
        })
      )}
    </div>
  );
}