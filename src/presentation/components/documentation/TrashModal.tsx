import type { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';

interface TrashModalProps {
  show: boolean;
  onClose: () => void;
  deletedDocuments: DocumentDto[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export function TrashModal({ show, onClose, deletedDocuments, onRestore, onPermanentDelete }: TrashModalProps): JSX.Element {
  if (!show) return <></>;

  return (
    <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content bg-dark text-light">
          <div className="modal-header border-secondary">
            <h5 className="modal-title">
              <i className="fa-solid fa-trash-can text-warning me-2" />
              Trash
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {deletedDocuments.length === 0 ? (
              <p className="text-muted text-center py-4">Trash is empty.</p>
            ) : (
              <div className="list-group">
                {deletedDocuments.map((doc) => (
                  <div key={doc.id} className="list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">{doc.title}</h6>
                      <small className="text-muted">{doc.path}</small>
                    </div>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-success me-2"
                        onClick={() => onRestore(doc.id)}
                      >
                        <i className="fa-solid fa-rotate-left me-1" /> Restore
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onPermanentDelete(doc.id)}
                      >
                        <i className="fa-solid fa-eraser me-1" /> Delete Forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}