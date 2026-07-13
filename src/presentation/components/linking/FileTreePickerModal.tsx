import { JSX, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';
import { useFileSystemStore } from '../../stores/filesystem.store';
import { useFileTree } from '../../hooks/useFileTree';
import { TargetDocumentSelector } from './TargetDocumentSelector';
import './FileTreePickerModal.css';

interface FileTreePickerModalProps {
  isOpen: boolean;
  documents: { id: string; title: string }[];
  initialDocumentId: string;
  onClose: () => void;
  onLink: (sourceIds: string[], targetDocumentId: string, sourceType: 'code' | 'document') => void;
}

// ---- Tab type ----
type PickerTab = 'code' | 'document';

// ---- TreeNode (file tree) ---- 
interface TreeNodeProps {
  node: FolderNodeDto | FileNodeDto;
  depth: number;
  selectedIds: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleFolder: (folder: FolderNodeDto, select: boolean) => void;
}

function isFolder(node: FolderNodeDto | FileNodeDto): node is FolderNodeDto {
  return 'children' in node;
}

function getAllFileIds(node: FolderNodeDto | FileNodeDto): string[] {
  if (!isFolder(node)) return [node.id];
  return node.children.flatMap(child => getAllFileIds(child));
}

function TreeNode({ node, depth, selectedIds, onToggleFile, onToggleFolder }: TreeNodeProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const folder = isFolder(node) ? node : null;
  const file = !folder ? (node as FileNodeDto) : null;

  const allChildIds = useMemo(() => (folder ? getAllFileIds(folder) : []), [folder]);
  const selectedChildCount = folder ? allChildIds.filter(id => selectedIds.has(id)).length : 0;
  const isFolderChecked = folder ? selectedChildCount === allChildIds.length : false;
  const isFolderIndeterminate = folder ? selectedChildCount > 0 && selectedChildCount < allChildIds.length : false;

  const handleFolderCheckbox = () => {
    if (!folder) return;
    onToggleFolder(folder, !isFolderChecked);
  };

  const toggleExpand = () => setExpanded(prev => !prev);

  if (file) {
    return (
      <div className="tree-node" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
        <label className="tree-node-label">
          <input
            type="checkbox"
            className="form-check-input"
            checked={selectedIds.has(file.id)}
            onChange={() => onToggleFile(file.id)}
          />
          <i className="fa-solid fa-file-code ms-2 text-secondary"></i>
          <span className="ms-2">{file.name}</span>
        </label>
      </div>
    );
  }

  if (folder) {
    return (
      <div className="tree-node">
        <div className="tree-folder-header" style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          <label className="tree-folder-checkbox">
            <input
              type="checkbox"
              className="form-check-input"
              checked={isFolderChecked}
              ref={el => { if (el) el.indeterminate = isFolderIndeterminate; }}
              onChange={handleFolderCheckbox}
            />
          </label>
          <span className="tree-folder-icon" onClick={toggleExpand}>
            <i className={`fa-solid ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`}></i>
            <i className={`fa-solid ${expanded ? 'fa-folder-open' : 'fa-folder'} text-warning me-2`}></i>
            <span>{folder.name}</span>
          </span>
        </div>
        {expanded && (
          <div className="tree-children">
            {folder.children.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedIds={selectedIds}
                onToggleFile={onToggleFile}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <></>;
}

// ---- Main Modal ----
export function FileTreePickerModal({
  isOpen,
  documents,
  initialDocumentId,
  onClose,
  onLink,
}: FileTreePickerModalProps): JSX.Element | null {
  const { tree, isScanning } = useFileSystemStore();
  const { scanProject } = useFileTree();

  const [activeTab, setActiveTab] = useState<PickerTab>('code');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [targetDocumentId, setTargetDocumentId] = useState(initialDocumentId);
  const modalRef = useRef<HTMLDivElement>(null);

  // reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFileIds(new Set());
      setSelectedDocumentIds(new Set());
      setTargetDocumentId(initialDocumentId);
      setActiveTab('code');
      if (!tree) scanProject();
    }
  }, [isOpen, initialDocumentId, tree, scanProject]);

  // file selection
  const toggleFile = useCallback((id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((folder: FolderNodeDto, select: boolean) => {
    const ids = getAllFileIds(folder);
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => select ? next.add(id) : next.delete(id));
      return next;
    });
  }, []);

  // document selection
  const toggleDocument = useCallback((id: string) => {
    setSelectedDocumentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllDocuments = () => {
    setSelectedDocumentIds(prev => {
      if (prev.size === documents.length) return new Set();
      return new Set(documents.map(d => d.id));
    });
  };

  const handleLink = () => {
    if (activeTab === 'code') {
      if (selectedFileIds.size === 0 || !targetDocumentId) return;
      onLink(Array.from(selectedFileIds), targetDocumentId, 'code');
    } else {
      if (selectedDocumentIds.size === 0 || !targetDocumentId) return;
      // filter out target doc from source (prevent self-link)
      const sourceIds = Array.from(selectedDocumentIds).filter(id => id !== targetDocumentId);
      if (sourceIds.length === 0) return;
      onLink(sourceIds, targetDocumentId, 'document');
    }
    onClose();
  };

  // compute count for the tab label
  const documentSourceList = useMemo(
    () => documents.filter(d => d.id !== targetDocumentId),
    [documents, targetDocumentId]
  );

  if (!isOpen) return null;

  return (
    <div className="file-picker-backdrop" onClick={onClose}>
      <div className="file-picker-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="file-picker-header">
          <h5 className="mb-0">Create Link</h5>
          <button className="btn btn-ghost" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="file-picker-body">
          {/* ---- Target document picker (searchable, keyboard‑navigable) ---- */}
          <TargetDocumentSelector
            documents={documents}
            selectedDocumentId={targetDocumentId}
            onSelectDocument={setTargetDocumentId}
          />

          {/* ---- Tab switcher ---- */}
          <div className="linking-tabs" style={{ marginTop: '12px' }}>
            <button
              className={`linking-tab ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              <i className="fa-solid fa-file-code me-1"></i> Code Files
            </button>
            <button
              className={`linking-tab ${activeTab === 'document' ? 'active' : ''}`}
              onClick={() => setActiveTab('document')}
            >
              <i className="fa-solid fa-file-lines me-1"></i> Documents
            </button>
          </div>

          {/* ---- Source list based on active tab ---- */}
          {activeTab === 'code' && (
            <div className="file-picker-tree">
              {isScanning || !tree ? (
                <div className="text-center p-4 text-secondary">
                  <i className="fa-solid fa-spinner fa-spin me-2"></i> Scanning project...
                </div>
              ) : (
                <>
                  <div className="tree-actions mb-2">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        if (!tree) return;
                        const allIds = getAllFileIds(tree);
                        if (selectedFileIds.size === allIds.length) setSelectedFileIds(new Set());
                        else setSelectedFileIds(new Set(allIds));
                      }}
                    >
                      {tree && selectedFileIds.size === getAllFileIds(tree).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <TreeNode
                    node={tree}
                    depth={0}
                    selectedIds={selectedFileIds}
                    onToggleFile={toggleFile}
                    onToggleFolder={toggleFolder}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'document' && (
            <div
              className="file-picker-tree"
              style={{ maxHeight: '50vh', overflowY: 'auto' }}
            >
              <div className="tree-actions mb-2">
                <button className="btn btn-sm btn-ghost" onClick={handleSelectAllDocuments}>
                  {selectedDocumentIds.size === documentSourceList.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {documentSourceList.length === 0 ? (
                <p className="text-secondary p-3 text-center">No other documents available.</p>
              ) : (
                documentSourceList.map(doc => {
                  const isChecked = selectedDocumentIds.has(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className="d-flex align-items-center py-2 px-2 rounded hover-bg"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--cn-bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={isChecked}
                        onChange={() => toggleDocument(doc.id)}
                      />
                      <i className="fa-solid fa-file-lines text-primary me-2"></i>
                      <span>{doc.title}</span>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="file-picker-footer">
          <span className="text-secondary small">
            {activeTab === 'code'
              ? `${selectedFileIds.size} file${selectedFileIds.size !== 1 ? 's' : ''} selected`
              : `${selectedDocumentIds.size} document${selectedDocumentIds.size !== 1 ? 's' : ''} selected`}
          </span>
          <div>
            <button className="btn btn-ghost me-2" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={
                (activeTab === 'code' && selectedFileIds.size === 0) ||
                (activeTab === 'document' && selectedDocumentIds.size === 0)
              }
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