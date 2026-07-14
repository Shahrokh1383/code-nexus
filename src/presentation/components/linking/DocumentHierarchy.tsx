import { JSX } from 'react';
import { DocumentDto } from '../../../domains/documentation/application/dto/document.dto';
import { DocumentLinkDto } from '../../../domains/linking/application/dto/document-link.dto';

interface DocumentHierarchyProps {
  documents: DocumentDto[];
  documentLinks: DocumentLinkDto[];
  selectedDocumentId: string | null;
  onRemoveDocumentLink: (linkId: string) => void;
  onSelectDocument: (id: string) => void;
}

export function DocumentHierarchy({
  documents,
  documentLinks,
  selectedDocumentId,
  onRemoveDocumentLink,
  onSelectDocument,
}: DocumentHierarchyProps): JSX.Element {
  if (!selectedDocumentId) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
        <div className="text-center">
          <i className="fa-solid fa-sitemap fa-3x mb-3" style={{ color: 'var(--cn-text-disabled)' }} />
          <p className="mb-0">Select a document to view its relationships.</p>
        </div>
      </div>
    );
  }

  const selectedDoc = documents.find(d => d.id === selectedDocumentId);
  if (!selectedDoc) {
    return (
      <div className="text-center p-4 text-secondary">
        <i className="fa-solid fa-triangle-exclamation me-2" />
        Document not found.
      </div>
    );
  }

  // Parents: documents that link TO the selected document
  const parentLinks = documentLinks.filter(l => l.childDocumentId === selectedDocumentId);
  const parents = parentLinks
    .map(link => ({
      document: documents.find(d => d.id === link.parentDocumentId),
      linkId: link.id,               // <-- FIX: use link.id, not spread ...link
    }))
    .filter(item => item.document !== undefined) as { document: DocumentDto; linkId: string }[];

  // Children: documents that the selected document links TO
  const childLinks = documentLinks.filter(l => l.parentDocumentId === selectedDocumentId);
  const children = childLinks
    .map(link => ({
      document: documents.find(d => d.id === link.childDocumentId),
      linkId: link.id,               // <-- FIX: use link.id
    }))
    .filter(item => item.document !== undefined) as { document: DocumentDto; linkId: string }[];

  return (
    <div className="p-4 h-100 d-flex flex-column" style={{ overflowY: 'auto' }}>
      {/* Selected document badge */}
      <div className="mb-4 p-3 rounded-3" style={{ backgroundColor: 'var(--cn-bg-secondary)', border: '1px solid var(--cn-border-light)' }}>
        <div className="d-flex align-items-center gap-3">
          <i className="fa-solid fa-file-lines fa-2x text-primary" />
          <div>
            <h6 className="mb-0 text-primary fw-bold">{selectedDoc.title}</h6>
            <small className="text-secondary">Currently viewing relationships</small>
          </div>
        </div>
      </div>

      {/* Parents Section */}
      <div className="mb-4">
        <h6 className="text-uppercase text-secondary small fw-bold mb-2">
          <i className="fa-solid fa-arrow-up-wide-short me-2" />
          Parents ({parents.length})
        </h6>
        {parents.length === 0 ? (
          <div className="text-secondary p-3 rounded-3" style={{ backgroundColor: 'var(--cn-bg-secondary)' }}>
            <small>No parent documents link to this one.</small>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {parents.map(item => (
              <div
                key={item.linkId}
                className="d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm hover-shadow"
                style={{
                  backgroundColor: 'var(--cn-bg-elevated)',
                  border: '1px solid var(--cn-border-light)',
                  transition: 'box-shadow 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--cn-shadow-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--cn-shadow-sm)')}
              >
                <div
                  className="d-flex align-items-center gap-3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectDocument(item.document.id)}
                >
                  <i className="fa-solid fa-file-lines text-secondary" />
                  <span>{item.document.title}</span>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger border-0"
                  onClick={(e) => { e.stopPropagation(); onRemoveDocumentLink(item.linkId); }}
                  title="Remove link"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children Section */}
      <div>
        <h6 className="text-uppercase text-secondary small fw-bold mb-2">
          <i className="fa-solid fa-arrow-down-wide-short me-2" />
          Children ({children.length})
        </h6>
        {children.length === 0 ? (
          <div className="text-secondary p-3 rounded-3" style={{ backgroundColor: 'var(--cn-bg-secondary)' }}>
            <small>This document doesn’t link to any other documents.</small>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {children.map(item => (
              <div
                key={item.linkId}
                className="d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm hover-shadow"
                style={{
                  backgroundColor: 'var(--cn-bg-elevated)',
                  border: '1px solid var(--cn-border-light)',
                  transition: 'box-shadow 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--cn-shadow-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--cn-shadow-sm)')}
              >
                <div
                  className="d-flex align-items-center gap-3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectDocument(item.document.id)}
                >
                  <i className="fa-solid fa-file-lines text-secondary" />
                  <span>{item.document.title}</span>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger border-0"
                  onClick={(e) => { e.stopPropagation(); onRemoveDocumentLink(item.linkId); }}
                  title="Remove link"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}