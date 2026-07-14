import { JSX, useState, useMemo } from 'react';
import { CodeFileSummaryDto } from '../../../domains/linking/application/dto/link.dto';
import { SearchBar } from '../common/SearchBar';

interface UnlinkedFilesListProps {
  files: CodeFileSummaryDto[];
  selectedIds: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleAll: () => void;
  onBulkLink: () => void;
  onQuickLink: (id: string) => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  currentDocumentTitle: string;
}

export function UnlinkedFilesList({
  files,
  selectedIds,
  onToggleFile,
  onToggleAll,
  onBulkLink,
  onQuickLink,
  isAllSelected,
  isIndeterminate,
  currentDocumentTitle,
}: UnlinkedFilesListProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return files;
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(term) ||
        file.path.toLowerCase().includes(term)
    );
  }, [files, searchTerm]);

  if (files.length === 0) {
    return (
      <div className="unlinked-empty">
        <i className="fa-solid fa-check-circle fa-3x text-success mb-3"></i>
        <h5 className="fw-semibold">All code files are linked!</h5>
        <p className="text-secondary">No unlinked files found in this project.</p>
      </div>
    );
  }

  return (
    <div className="unlinked-container">
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search unlinked files..."
        onClear={() => setSearchTerm('')}
        aria-label="Search unlinked files"
      />
      <div className="unlinked-toolbar">
        <label className="unlinked-select-all">
          <input
            type="checkbox"
            className="unlinked-checkbox me-2"
            checked={isAllSelected}
            ref={el => { if (el) el.indeterminate = isIndeterminate; }}
            onChange={onToggleAll}
          />
          <span className="fw-medium">{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}</span>
        </label>
        <button
          className="btn btn-sm btn-ghost ms-auto"
          onClick={() => onToggleAll()}
          title={isAllSelected ? 'Deselect all' : 'Select all'}
        >
          <i className={`fa-solid ${isAllSelected ? 'fa-square-check' : 'fa-square'}`}></i>
        </button>
      </div>

      <div className="unlinked-list">
        {filteredFiles.map(file => (
          <div
            key={file.id}
            className={`unlinked-item ${selectedIds.has(file.id) ? 'selected' : ''}`}
          >
            <label className="unlinked-item-label">
              <input
                type="checkbox"
                className="unlinked-checkbox me-3"
                checked={selectedIds.has(file.id)}
                onChange={() => onToggleFile(file.id)}
              />
              <i className="fa-solid fa-file-code text-primary me-2"></i>
              <div className="unlinked-item-info">
                <span className="unlinked-item-name">{file.name}</span>
                <span className="unlinked-item-path">{file.path}</span>
              </div>
            </label>
            <button
              className="btn btn-sm btn-outline-primary ms-3"
              onClick={() => onQuickLink(file.id)}
              title={`Link to ${currentDocumentTitle}`}
            >
              <i className="fa-solid fa-link me-1"></i> Link
            </button>
          </div>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="unlinked-bulk-bar">
          <span className="text-secondary">
            <i className="fa-solid fa-link me-2"></i>
            Link {selectedIds.size} selected file{selectedIds.size > 1 ? 's' : ''} to <strong>{currentDocumentTitle}</strong>
          </span>
          <button className="btn btn-primary btn-sm ms-auto" onClick={onBulkLink}>
            Apply Links
          </button>
        </div>
      )}
    </div>
  );
}