// src/presentation/components/documentation/TrashModal.tsx
import type { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';

interface TrashModalProps {
  show: boolean;
  onClose: () => void;
  deletedDocuments: DocumentDto[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function TrashModal({ show, onClose, deletedDocuments, onRestore, onPermanentDelete }: TrashModalProps): JSX.Element | null {
  if (!show) return null;

  return (
    <div className="trash-modal-overlay" onClick={onClose}>
      <div className="trash-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="trash-modal-header">
          <h2><i className="fa-solid fa-trash-can text-warning me-2" /> Trash</h2>
          <button className="btn-ghost trash-close-btn" onClick={onClose} aria-label="Close trash">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="trash-modal-body">
          {deletedDocuments.length === 0 ? (
            <p className="trash-empty-state">Trash is empty.</p>
          ) : (
            <div className="trash-list">
              {deletedDocuments.map((doc) => (
                <div key={doc.id} className="trash-item">
                  <div className="trash-item-info">
                    <i className="fa-solid fa-file-lines text-secondary"></i>
                    <div className="trash-path-container">
                      <span className="trash-root-name">{doc.title}</span>
                      <span className="trash-full-path">{doc.path}</span>
                    </div>
                  </div>
                  
                  <div className="trash-item-actions">
                    <button className="btn-ghost trash-restore-btn" onClick={() => onRestore(doc.id)}>
                      <i className="fa-solid fa-rotate-left" /> Restore
                    </button>
                    <button className="btn-ghost trash-delete-btn" onClick={() => onPermanentDelete(doc.id)}>
                      <i className="fa-solid fa-eraser" /> Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}