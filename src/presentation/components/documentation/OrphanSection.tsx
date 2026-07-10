import type { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { DocumentCard } from './DocumentCard';

interface OrphanSectionProps {
  orphans: DocumentDto[];
  onDelete: (id: string) => void;
}

export function OrphanSection({ orphans, onDelete }: OrphanSectionProps): JSX.Element | null {
  if (orphans.length === 0) return null;

  return (
    <section className="orphan-section">
      <div className="orphan-section__header">
        <h2><i className="fa-solid fa-ghost text-warning" /> Orphaned Documents</h2>
        <span className="pill pill-warning">{orphans.length} Found</span>
      </div>
      <p className="orphan-section__description">
        These documents exist in your folder but have zero links to any code files.
      </p>
      <div className="document-list">
        {orphans.map((doc) => <DocumentCard key={doc.id} document={doc} onDelete={onDelete} />)}
      </div>
    </section>
  );
}