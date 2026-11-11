import { JSX } from 'react';
import type { DocumentDto } from '@shared/ipc/documentation';
import type { DocumentLinkDto } from '@shared/ipc/linking';

interface DocumentHierarchyProps {
  documents: readonly DocumentDto[];
  documentLinks: DocumentLinkDto[];
  selectedDocumentId: string | null;
  onRemoveDocumentLink: (linkId: string) => void;
  onSelectDocument: (id: string) => void;
}

interface HierarchyItem {
  document: DocumentDto;
  linkId: string;
}

function HierarchySection({
  title,
  icon,
  emptyMessage,
  items,
  onSelectDocument,
  onRemoveDocumentLink,
}: {
  title: string;
  icon: string;
  emptyMessage: string;
  items: HierarchyItem[];
  onSelectDocument: (id: string) => void;
  onRemoveDocumentLink: (linkId: string) => void;
}): JSX.Element {
  return (
    <div className="mb-4">
      <h6 className="text-uppercase text-secondary small fw-bold mb-2">
        <i className={`fa-solid ${icon} me-2`} />
        {title} ({items.length})
      </h6>
      {items.length === 0 ? (
        <div
          className="text-secondary p-3 rounded-3"
          style={{ backgroundColor: 'var(--cn-bg-secondary)' }}
        >
          <small>{emptyMessage}</small>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {items.map((item) => (
            <div
              key={item.linkId}
              className="d-flex align-items-center justify-content-between p-3 rounded-3 shadow-sm hover-shadow"
              style={{
                backgroundColor: 'var(--cn-bg-elevated)',
                border: '1px solid var(--cn-border-light)',
                transition: 'box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = 'var(--cn-shadow-md)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = 'var(--cn-shadow-sm)')
              }
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
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDocumentLink(item.linkId);
                }}
                title="Remove link"
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
          <i
            className="fa-solid fa-sitemap fa-3x mb-3"
            style={{ color: 'var(--cn-text-disabled)' }}
          />
          <p className="mb-0">Select a document to view its relationships.</p>
        </div>
      </div>
    );
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
  if (!selectedDoc) {
    return (
      <div className="text-center p-4 text-secondary">
        <i className="fa-solid fa-triangle-exclamation me-2" />
        Document not found.
      </div>
    );
  }

  const parents: HierarchyItem[] = documentLinks
    .filter((l) => l.childDocumentId === selectedDocumentId)
    .map((link) => ({
      document: documents.find((d) => d.id === link.parentDocumentId),
      linkId: link.id,
    }))
    .filter(
      (item): item is HierarchyItem => item.document !== undefined
    );

  const children: HierarchyItem[] = documentLinks
    .filter((l) => l.parentDocumentId === selectedDocumentId)
    .map((link) => ({
      document: documents.find((d) => d.id === link.childDocumentId),
      linkId: link.id,
    }))
    .filter(
      (item): item is HierarchyItem => item.document !== undefined
    );

  return (
    <div
      className="p-4 h-100 d-flex flex-column"
      style={{ overflowY: 'auto' }}
    >
      <div
        className="mb-4 p-3 rounded-3"
        style={{
          backgroundColor: 'var(--cn-bg-secondary)',
          border: '1px solid var(--cn-border-light)',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <i className="fa-solid fa-file-lines fa-2x text-primary" />
          <div>
            <h6 className="mb-0 text-primary fw-bold">{selectedDoc.title}</h6>
            <small className="text-secondary">Currently viewing relationships</small>
          </div>
        </div>
      </div>

      <HierarchySection
        title="Parents"
        icon="fa-arrow-up-wide-short"
        emptyMessage="No parent documents link to this one."
        items={parents}
        onSelectDocument={onSelectDocument}
        onRemoveDocumentLink={onRemoveDocumentLink}
      />
      <HierarchySection
        title="Children"
        icon="fa-arrow-down-wide-short"
        emptyMessage="This document doesn't link to any other documents."
        items={children}
        onSelectDocument={onSelectDocument}
        onRemoveDocumentLink={onRemoveDocumentLink}
      />
    </div>
  );
}