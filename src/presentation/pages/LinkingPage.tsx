import { JSX, useState } from 'react';
import { useLinks } from '../hooks/linking/useLinks';
import { useLinkingPageOrchestrator } from '../hooks/linking/useLinkingPageOrchestrator';
import { useLinkCreation } from '../hooks/linking/useLinkCreation';
import { useUnlinkedFiles } from '../hooks/linking/useUnlinkedFiles';
import { LinkingPageHeader } from '../components/linking/LinkingPageHeader';
import { LinkGraph } from '../components/linking/LinkGraph';
import { DocumentHierarchy } from '../components/linking/DocumentHierarchy';
import { UnlinkedFilesList } from '../components/linking/UnlinkedFilesList';
import { FileTreePickerModal } from '../components/linking/FileTreePickerModal';
import { TargetDocumentSelector } from '../components/linking/TargetDocumentSelector';
import { LinkingTabs } from '../components/linking/LinkingTabs';
import '../styles/linking.css';
import '../components/linking/UnlinkedFilesList.css';

export function LinkingPage(): JSX.Element {
  const { documents, selectedDocId, setSelectedDocId, selectedDoc, currentDocTitle } = useLinkingPageOrchestrator();
  
  const {
    codeLinks,
    documentLinks,
    unlinkedFiles,
    isLoading,
    error,
    clearError,
  } = useLinks();

  const [activeTab, setActiveTab] = useState<'graph' | 'hierarchy' | 'unlinked'>('graph');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { handleModalLink } = useLinkCreation(() => setIsModalOpen(false));

  const {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleFile,
    toggleAll,
    handleQuickLink,
    handleBulkLink,
  } = useUnlinkedFiles(selectedDocId);

  const pageTabs = [
    { id: 'graph', label: 'Graph View', icon: 'fa-project-diagram' },
    { id: 'hierarchy', label: 'Hierarchy', icon: 'fa-sitemap' },
    { id: 'unlinked', label: 'Unlinked Files', icon: 'fa-unlink' },
  ];

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

      <LinkingTabs tabs={pageTabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as any)} />

      <div className="flex-grow-1 overflow-auto">
        {activeTab === 'graph' && (
          <LinkGraph centerDocument={selectedDoc} codeLinks={codeLinks} />
        )}
        {activeTab === 'hierarchy' && (
          <DocumentHierarchy documents={documents} documentLinks={documentLinks} />
        )}
        {activeTab === 'unlinked' && (
          <>
            <TargetDocumentSelector
              documents={documents}
              selectedDocumentId={selectedDocId}
              onSelectDocument={setSelectedDocId}
            />
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
          </>
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