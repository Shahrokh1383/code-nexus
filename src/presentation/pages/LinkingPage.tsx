import { JSX, useState, useEffect } from 'react';
import { useLinks } from '../hooks/useLinks';
import { useDocuments } from '../hooks/useDocuments';
import { LinkingPageHeader } from '../components/linking/LinkingPageHeader';
import { LinkGraph } from '../components/linking/LinkGraph';
import { DocumentHierarchy } from '../components/linking/DocumentHierarchy';
import { UnlinkedFilesList } from '../components/linking/UnlinkedFilesList';
import { FileTreePickerModal } from '../components/linking/FileTreePickerModal';
import { useUnlinkedFiles } from '../hooks/useUnlinkedFiles';
import '../styles/linking.css';
import '../components/linking/UnlinkedFilesList.css';

export function LinkingPage(): JSX.Element {
  const { documents } = useDocuments();
  const { 
    codeLinks, documentLinks, unlinkedFiles, isLoading, error, 
    fetchLinksForDocument, clearError, createBulkCodeLinks 
  } = useLinks();

  const [activeTab, setActiveTab] = useState<'graph' | 'hierarchy' | 'unlinked'>('graph');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  useEffect(() => {
    if (selectedDocId) fetchLinksForDocument(selectedDocId);
  }, [selectedDocId, fetchLinksForDocument]);

  const selectedDoc = documents.find(d => d.id === selectedDocId) || null;
  const currentDocTitle = selectedDoc?.title ?? 'document';

  const {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleFile,
    toggleAll,
    handleQuickLink,
    handleBulkLink,
  } = useUnlinkedFiles(selectedDocId);

  const handleModalLink = (fileIds: string[], documentId: string) => {
    createBulkCodeLinks(fileIds, documentId);
  };

  return (
    <div className="linking-page">
      <LinkingPageHeader 
        totalCodeLinks={codeLinks.length} 
        totalDocLinks={documentLinks.length} 
        unlinkedCount={unlinkedFiles.length}
        onCreateLink={() => setIsModalOpen(true)} 
      />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {error}
          <button type="button" className="btn-close" onClick={clearError}></button>
        </div>
      )}

      <div className="linking-tabs">
        <button className={`linking-tab ${activeTab === 'graph' ? 'active' : ''}`} onClick={() => setActiveTab('graph')}>
          <i className="fa-solid fa-project-diagram me-2"></i> Graph View
        </button>
        <button className={`linking-tab ${activeTab === 'hierarchy' ? 'active' : ''}`} onClick={() => setActiveTab('hierarchy')}>
          <i className="fa-solid fa-sitemap me-2"></i> Hierarchy
        </button>
        <button className={`linking-tab ${activeTab === 'unlinked' ? 'active' : ''}`} onClick={() => setActiveTab('unlinked')}>
          <i className="fa-solid fa-unlink me-2"></i> Unlinked Files
        </button>
      </div>

      <div className="flex-grow-1 overflow-auto">
        {activeTab === 'graph' && (
          <LinkGraph centerDocument={selectedDoc} codeLinks={codeLinks} />
        )}
        {activeTab === 'hierarchy' && (
          <DocumentHierarchy documents={documents} documentLinks={documentLinks} />
        )}
        {activeTab === 'unlinked' && (
          <UnlinkedFilesList 
            files={unlinkedFiles}
            selectedIds={selectedIds}
            onToggleFile={toggleFile}
            onToggleAll={toggleAll}
            onBulkLink={handleBulkLink}
            onQuickLink={handleQuickLink}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            currentDocumentTitle={currentDocTitle}
          />
        )}
      </div>

      <FileTreePickerModal
        isOpen={isModalOpen}
        documents={documents.map(d => ({ id: d.id, title: d.title }))}
        initialDocumentId={selectedDocId ?? ''}
        onClose={() => setIsModalOpen(false)}
        onLink={handleModalLink}
      />
      
      {isLoading && (
        <div className="position-fixed bottom-0 end-0 m-4 bg-elevated p-3 rounded shadow-lg text-primary">
          <i className="fa-solid fa-spinner fa-spin me-2"></i> Syncing Graph...
        </div>
      )}
    </div>
  );
}