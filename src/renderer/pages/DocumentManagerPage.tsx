import { useState } from 'react';
import type { JSX } from 'react';
import {
  useDocuments,
  openDirectoryPicker,
  DocumentationHeader,
  OrphanSection,
  DocumentList,
  TrashModal,
  FolderRegistrationPrompt,
} from '../features/documentation';
import '../shared/styles/documentation.css';

export function DocumentManagerPage(): JSX.Element {
  const {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    registerFolder, softDeleteDocument, permanentDeleteDocument, restoreDocument, clearError
  } = useDocuments();

  const [showTrashModal, setShowTrashModal] = useState(false);
  const linkedDocuments = (documents || []).filter(doc => !doc.isOrphaned);

  const handleFolderSelection = async () => {
    try {
      const selectedFolder = await openDirectoryPicker();
      if (selectedFolder) {
        await registerFolder(selectedFolder);
      }
    } catch {}
  };

  return (
    <div className="document-manager-page">
      <DocumentationHeader
        docFolder={docFolder}
        isLoading={isLoading}
        deletedCount={deletedDocuments.length}
        onChangeFolder={handleFolderSelection}
        onOpenTrash={() => setShowTrashModal(true)}
      />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={clearError} aria-label="Close"></button>
        </div>
      )}

      <div className="document-manager-content">
        {!docFolder && !isLoading ? (
          <FolderRegistrationPrompt isLoading={isLoading} onRegister={handleFolderSelection} />
        ) : (
          <>
            <OrphanSection orphans={orphans} onDelete={softDeleteDocument} />
            <section className="linked-documents-section">
              <div className="section-header">
                <h2><i className="fa-solid fa-file-code text-success" /> Linked Documents</h2>
                <span className="pill pill-success">{linkedDocuments.length} Active</span>
              </div>
              <DocumentList documents={linkedDocuments} onDelete={softDeleteDocument} />
            </section>
          </>
        )}
      </div>

      <TrashModal
        show={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        deletedDocuments={deletedDocuments}
        onRestore={restoreDocument}
        onPermanentDelete={permanentDeleteDocument}
      />
    </div>
  );
}