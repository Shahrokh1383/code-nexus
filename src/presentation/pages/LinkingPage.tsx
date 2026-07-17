import { JSX, useState, useCallback, useEffect } from 'react';
import { useLinks } from '../hooks/linking/useLinks';
import { useLinkingPageOrchestrator } from '../hooks/linking/useLinkingPageOrchestrator';
import { useLinkCreation } from '../hooks/linking/useLinkCreation';
import { useUnlinkedFiles } from '../hooks/linking/useUnlinkedFiles';
import { useLinkedFiles } from '../hooks/linking/useLinkedFiles';
import { useDocuments } from '../hooks/useDocuments';
import { LinkingPageHeader } from '../components/linking/LinkingPageHeader';
import { LinkedFilesList } from '../components/linking/LinkedFilesList';
import { DocumentHierarchy } from '../components/linking/DocumentHierarchy';
import { UnlinkedFilesList } from '../components/linking/UnlinkedFilesList';
import { FileTreePickerModal } from '../components/linking/FileTreePickerModal';
import { PersistentDocumentSelector } from '../components/linking/PersistentDocumentSelector';
import { LinkingTabs } from '../components/linking/LinkingTabs';
import '../styles/linking.css';
import '../styles/search-bar.css';
import '../components/linking/UnlinkedFilesList.css';

export function LinkingPage(): JSX.Element {
  const { documents, selectedDocId, setSelectedDocId, selectedDoc, currentDocTitle } = useLinkingPageOrchestrator();
  const { codeLinks, documentLinks, unlinkedFiles, isLoading, error, clearError, fetchLinksForDocument, fetchGraphData, removeDocumentLink } = useLinks();
  const [activeTab, setActiveTab] = useState<'linked' | 'hierarchy' | 'unlinked'>('linked');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { handleModalLink } = useLinkCreation(() => setIsModalOpen(false));
  const { selectedIds, isAllSelected, isIndeterminate, toggleFile, toggleAll, handleQuickLink, handleBulkLink } = useUnlinkedFiles(selectedDocId);
  const { codeLinks: linkedFiles, removeLink } = useLinkedFiles(selectedDocId);

  // After a document deletion (parent with children), links might have been migrated.
  // The documents array length will change, so we refresh everything.
  const { documents: allDocs } = useDocuments();
  useEffect(() => {
    if (allDocs.length > 0) {
      fetchGraphData();
      if (selectedDocId && allDocs.find(d => d.id === selectedDocId)) {
        fetchLinksForDocument(selectedDocId);
      }
    }
  }, [allDocs.length]);

  const handleRemoveDocumentLink = useCallback(async (linkId: string) => {
    await removeDocumentLink(linkId);
    await fetchGraphData();
    if (selectedDocId) {
      await fetchLinksForDocument(selectedDocId);
    }
  }, [removeDocumentLink, fetchGraphData, fetchLinksForDocument, selectedDocId]);

  const pageTabs = [
    { id: 'linked', label: 'Linked Files', icon: 'fa-list' },
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
        <div className="alert alert-danger alert-dismissible fade show m-0" role="alert">
          <i className="fa-solid fa-circle-exclamation" /> {error}
          <button type="button" className="btn-close" onClick={clearError}></button>
        </div>
      )}

      <div className="linking-body">
        <aside className="linking-sidebar">
          <div className="linking-sidebar__header">
            <i className="fa-solid fa-file-lines" />
            <span>Documents</span>
          </div>
          <div className="linking-sidebar__body">
            <PersistentDocumentSelector
              documents={documents.map(d => ({ id: d.id, title: d.title }))}
              selectedDocumentId={selectedDocId}
              onSelectDocument={setSelectedDocId}
            />
          </div>
        </aside>

        <div className="linking-main">
          <LinkingTabs tabs={pageTabs} activeTab={activeTab} onTabChange={id => setActiveTab(id as any)} />
          <div className="linking-main__content">
            {activeTab === 'linked' && (
              selectedDoc ? (
                <LinkedFilesList
                  documentTitle={selectedDoc.title}
                  codeLinks={linkedFiles}
                  onRemoveLink={removeLink}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100" style={{ color: 'var(--cn-text-secondary)' }}>
                  <div className="text-center">
                    <i className="fa-solid fa-list fa-3x mb-3" style={{ color: 'var(--cn-text-disabled)' }} />
                    <p>Select a document from the sidebar to view its linked code files</p>
                  </div>
                </div>
              )
            )}
            {activeTab === 'hierarchy' && (
              <DocumentHierarchy
                documents={documents}
                documentLinks={documentLinks}
                selectedDocumentId={selectedDocId}
                onRemoveDocumentLink={handleRemoveDocumentLink}
                onSelectDocument={setSelectedDocId}
              />
            )}
            {activeTab === 'unlinked' && (
              <div className="p-3">
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
              </div>
            )}
          </div>
        </div>
      </div>

      <FileTreePickerModal
        isOpen={isModalOpen}
        documents={documents.map(d => ({ id: d.id, title: d.title }))}
        initialDocumentId={selectedDocId ?? ''}
        onClose={() => setIsModalOpen(false)}
        onLink={handleModalLink}
      />
      {isLoading && (
        <div className="position-fixed bottom-0 end-0 m-4 p-3 rounded shadow-lg" style={{ backgroundColor: 'var(--cn-bg-elevated)', color: 'var(--cn-primary)' }}>
          <i className="fa-solid fa-spinner fa-spin me-2" /> Syncing Links...
        </div>
      )}
    </div>
  );
}