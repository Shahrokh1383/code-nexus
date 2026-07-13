import { JSX } from 'react';
import { useFileTreePicker } from '../../hooks/linking/useFileTreePicker';
import { TargetDocumentSelector } from './TargetDocumentSelector';
import { FileTreeNode } from './FileTreeNode';
import { DocumentSourceList } from './DocumentSourceList';
import { LinkingTabs } from './LinkingTabs';
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

  const handleLink = () => {
    if (picker.activeTab === 'code') {
      if (picker.selectedFileIds.size === 0 || !picker.targetDocumentId) return;
      onLink(Array.from(picker.selectedFileIds), picker.targetDocumentId, 'code');
    } else {
      if (picker.selectedDocumentIds.size === 0 || !picker.targetDocumentId) return;
      const sourceIds = Array.from(picker.selectedDocumentIds).filter(id => id !== picker.targetDocumentId);
      if (sourceIds.length === 0) return;
      onLink(sourceIds, picker.targetDocumentId, 'document');
    }
    onClose();
  };

  const tabs = [
    { id: 'code', label: 'Code Files', icon: 'fa-file-code' },
    { id: 'document', label: 'Documents', icon: 'fa-file-lines' },
  ];

  if (!isOpen) return null;

  const isLinkDisabled = 
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

        <div className="file-picker-body">
          <TargetDocumentSelector
            documents={documents}
            selectedDocumentId={picker.targetDocumentId}
            onSelectDocument={picker.setTargetDocumentId}
          />

          <LinkingTabs 
            tabs={tabs} 
            activeTab={picker.activeTab} 
            onTabChange={(id) => picker.setActiveTab(id as 'code' | 'document')} 
          />

          {picker.activeTab === 'code' && (
            <div className="file-picker-tree">
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
                    node={picker.tree}
                    depth={0}
                    selectedIds={picker.selectedFileIds}
                    onToggleFile={picker.toggleFile}
                    onToggleFolder={picker.toggleFolder}
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