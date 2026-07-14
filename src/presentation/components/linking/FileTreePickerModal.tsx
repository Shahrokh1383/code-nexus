import { JSX, useState, useMemo } from 'react';
import { useFileTreePicker } from '../../hooks/linking/useFileTreePicker';
import { FileTreeNode } from './FileTreeNode';
import { DocumentSourceList } from './DocumentSourceList';
import { LinkingTabs } from './LinkingTabs';
import { SearchBar } from '../common/SearchBar';
import { useFilteredFileTree, getAllFolderIds } from '../../hooks/linking/useFilteredFileTree';
import './FileTreePickerModal.css';

interface FileTreePickerModalProps {
  isOpen: boolean;
  documents: { id: string; title: string }[];
  initialDocumentId: string;
  onClose: () => void;
  onLink: (sourceIds: string[], targetDocumentId: string, sourceType: 'code' | 'document') => void;
}

export function FileTreePickerModal({
  isOpen,
  documents,
  initialDocumentId,
  onClose,
  onLink,
}: FileTreePickerModalProps): JSX.Element | null {
  const picker = useFileTreePicker(isOpen, documents, initialDocumentId);
  const [codeSearchTerm, setCodeSearchTerm] = useState('');

  const filteredTree = useFilteredFileTree(picker.tree, codeSearchTerm);
  const isSearchActive = codeSearchTerm.trim().length > 0;
  const expandedFolderIds = isSearchActive && filteredTree ? new Set(getAllFolderIds(filteredTree)) : undefined;

  const targetDocTitle = useMemo(
    () => documents.find(d => d.id === initialDocumentId)?.title ?? 'Unknown document',
    [documents, initialDocumentId]
  );

  const handleLink = () => {
    if (!initialDocumentId) return;
    if (picker.activeTab === 'code') {
      if (picker.selectedFileIds.size === 0) return;
      onLink(Array.from(picker.selectedFileIds), initialDocumentId, 'code');
    } else {
      if (picker.selectedDocumentIds.size === 0) return;
      const sourceIds = Array.from(picker.selectedDocumentIds).filter(id => id !== initialDocumentId);
      if (sourceIds.length === 0) return;
      onLink(sourceIds, initialDocumentId, 'document');
    }
    onClose();
  };

  const tabs = [
    { id: 'code', label: 'Code Files', icon: 'fa-file-code' },
    { id: 'document', label: 'Documents', icon: 'fa-file-lines' },
  ];

  if (!isOpen) return null;

  const isLinkDisabled = 
    !initialDocumentId ||
    (picker.activeTab === 'code' && picker.selectedFileIds.size === 0) ||
    (picker.activeTab === 'document' && picker.selectedDocumentIds.size === 0);

  return (
    <div className="file-picker-backdrop" onClick={onClose}>
      <div className="file-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="file-picker-header">
          <h5 className="mb-0">Create Link</h5>
          <button className="btn btn-ghost" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Target document indicator */}
        {initialDocumentId && (
          <div 
            className="px-3 py-2 d-flex align-items-center gap-2" 
            style={{ 
              backgroundColor: 'var(--cn-bg-secondary)', 
              borderBottom: '1px solid var(--cn-border-light)',
              fontSize: '0.9rem'
            }}
          >
            <i className="fa-solid fa-link text-primary" />
            <span className="text-secondary">Linking to:</span>
            <strong className="text-primary">{targetDocTitle}</strong>
          </div>
        )}

        <div className="file-picker-body">
          <LinkingTabs 
            tabs={tabs} 
            activeTab={picker.activeTab} 
            onTabChange={(id) => picker.setActiveTab(id as 'code' | 'document')} 
          />

          {picker.activeTab === 'code' && (
            <div className="file-picker-tree">
              <SearchBar
                value={codeSearchTerm}
                onChange={setCodeSearchTerm}
                placeholder="Search files..."
                onClear={() => setCodeSearchTerm('')}
                aria-label="Search files"
              />
              {picker.isScanning || !picker.tree ? (
                <div className="text-center p-4 text-secondary">
                  <i className="fa-solid fa-spinner fa-spin me-2"></i> Scanning project...
                </div>
              ) : (
                <>
                  <div className="tree-actions mb-2">
                    <button className="btn btn-sm btn-ghost" onClick={picker.handleToggleAllFiles}>
                      {picker.isAllFilesSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <FileTreeNode
                    node={filteredTree ?? picker.tree}
                    depth={0}
                    selectedIds={picker.selectedFileIds}
                    onToggleFile={picker.toggleFile}
                    onToggleFolder={picker.toggleFolder}
                    expandedFolderIds={expandedFolderIds}
                  />
                </>
              )}
            </div>
          )}

          {picker.activeTab === 'document' && (
            <DocumentSourceList
              documents={picker.documentSourceList}
              selectedIds={picker.selectedDocumentIds}
              onToggleDocument={picker.toggleDocument}
              onSelectAll={picker.handleSelectAllDocuments}
            />
          )}
        </div>

        <div className="file-picker-footer">
          <span className="text-secondary small">
            {picker.activeTab === 'code'
              ? `${picker.selectedFileIds.size} file${picker.selectedFileIds.size !== 1 ? 's' : ''} selected`
              : `${picker.selectedDocumentIds.size} document${picker.selectedDocumentIds.size !== 1 ? 's' : ''} selected`}
          </span>
          <div>
            <button className="btn btn-ghost me-2" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={isLinkDisabled}
              onClick={handleLink}
            >
              Link Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}