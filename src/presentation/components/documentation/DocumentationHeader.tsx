import type { JSX } from 'react';
import { DocFolderDto } from '../../../domains/documentation/application/dto/doc-folder.dto';

interface DocumentationHeaderProps {
  docFolder: DocFolderDto | null;
  isLoading: boolean;
  deletedCount: number;
  onDetectRelocation: () => void;
  onOpenTrash: () => void;
}

export function DocumentationHeader({
  docFolder,
  isLoading,
  deletedCount,
  onDetectRelocation,
  onOpenTrash,
}: DocumentationHeaderProps): JSX.Element {
  return (
    <header className="documentation-header">
      <div className="documentation-header__info">
        <h1><i className="fa-solid fa-book-open-reader text-primary" /> Documentation Manager</h1>
        {docFolder && (
          <p className="documentation-header__path">
            <i className="fa-solid fa-folder-tree" /> Active Folder: <strong>{docFolder.path}</strong>
          </p>
        )}
      </div>
      {docFolder && (
        <div className="d-flex gap-2">
          <button className="btn-secondary" onClick={onDetectRelocation} disabled={isLoading}>
            <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-location'}`} />
            Detect Relocation
          </button>
          <button className="btn-secondary position-relative" onClick={onOpenTrash}>
            <i className="fa-solid fa-trash-can" />
            {deletedCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {deletedCount}
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
}