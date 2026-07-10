// src/presentation/components/documentation/DocumentationHeader.tsx
import type { JSX } from 'react';
import { DocFolderDto } from '../../../domains/documentation/application/dto/doc-folder.dto';

interface DocumentationHeaderProps {
  docFolder: DocFolderDto | null;
  isLoading: boolean;
  onDetectRelocation: () => void;
}

export function DocumentationHeader({ docFolder, isLoading, onDetectRelocation }: DocumentationHeaderProps): JSX.Element {
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
        <button className="btn-secondary" onClick={onDetectRelocation} disabled={isLoading}>
          <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-location'}`} />
          Detect Relocation
        </button>
      )}
    </header>
  );
}