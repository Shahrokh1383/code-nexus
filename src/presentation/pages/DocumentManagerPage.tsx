import type { JSX } from 'react';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentationHeader } from '../components/documentation/DocumentationHeader';
import { OrphanSection } from '../components/documentation/OrphanSection';
import { DocumentList } from '../components/documentation/DocumentList';
import { FolderRegistrationPrompt } from '../components/documentation/FolderRegistrationPrompt';
import '../styles/documentation.css';

export function DocumentManagerPage(): JSX.Element {
  const { 
    documents, docFolder, orphans, isLoading, error, 
    registerFolder, detectRelocation, deleteDocument, clearError 
  } = useDocuments();

  const linkedDocuments = (documents || []).filter(doc => !doc.isOrphaned);

  return (
    <div className="document-manager-page">
      <DocumentationHeader docFolder={docFolder} isLoading={isLoading} onDetectRelocation={detectRelocation} />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={clearError} aria-label="Close"></button>
        </div>
      )}

      <div className="document-manager-content">
        {!docFolder && !isLoading ? (
          <FolderRegistrationPrompt isLoading={isLoading} onRegister={() => registerFolder()} />
        ) : (
          <>
            <OrphanSection orphans={orphans} onDelete={deleteDocument} />
            <section className="linked-documents-section">
              <div className="section-header">
                <h2><i className="fa-solid fa-file-code text-success" /> Linked Documents</h2>
                <span className="pill pill-success">{linkedDocuments.length} Active</span>
              </div>
              <DocumentList documents={linkedDocuments} onDelete={deleteDocument} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}