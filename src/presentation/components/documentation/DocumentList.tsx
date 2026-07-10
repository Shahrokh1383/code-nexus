import type { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { DocumentCard } from './DocumentCard';

interface DocumentListProps {
  documents: DocumentDto[];
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps): JSX.Element {
  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-folder-open empty-state__icon" />
        <h3>No documents found in this folder.</h3>
      </div>
    );
  }

  return (
    <div className="document-list">
      {documents.map((doc) => <DocumentCard key={doc.id} document={doc} onDelete={onDelete} />)}
    </div>
  );
}