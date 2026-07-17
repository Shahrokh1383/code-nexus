import { useState } from 'react';
import type { JSX } from 'react';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentationHeader } from '../components/documentation/DocumentationHeader';
import { OrphanSection } from '../components/documentation/OrphanSection';
import { DocumentList } from '../components/documentation/DocumentList';
import { TrashModal } from '../components/documentation/TrashModal';
import { FolderRegistrationPrompt } from '../components/documentation/FolderRegistrationPrompt';
import { useIpc } from '../hooks/useIpc';
import { IpcChannels } from '../../../electron/ipc/channels';
import '../styles/documentation.css';

export function DocumentManagerPage(): JSX.Element {
  const ipc = useIpc();
  const {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    registerFolder, detectRelocation, softDeleteDocument,
    permanentDeleteDocument, restoreDocument, clearError
  } = useDocuments();

  const [showTrashModal, setShowTrashModal] = useState(false);

  const linkedDocuments = (documents || []).filter(doc => !doc.isOrphaned);

  const handleRegisterFolder = async () => {
    try {
      const response = await ipc.invoke(IpcChannels.DIALOG_OPEN_FOLDER) as { success: boolean; data?: string[] };
      if (response.success && response.data && response.data.length > 0) {
        await registerFolder(response.data[0]);
      }
    } catch {}
  };

  return (
    <div className="document-manager-page">
      <DocumentationHeader
        docFolder={docFolder}
        isLoading={isLoading}
        deletedCount={deletedDocuments.length}
        onDetectRelocation={detectRelocation}
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
          <FolderRegistrationPrompt isLoading={isLoading} onRegister={handleRegisterFolder} />
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