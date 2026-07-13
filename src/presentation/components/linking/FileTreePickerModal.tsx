import { JSX, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';
import { useFileSystemStore } from '../../stores/filesystem.store';
import { useFileTree } from '../../hooks/useFileTree';
import './FileTreePickerModal.css';

interface FileTreePickerModalProps {
  isOpen: boolean;
  documents: { id: string; title: string }[];
  initialDocumentId: string;
  onClose: () => void;
  onLink: (fileIds: string[], documentId: string) => void;
}

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
  const selectedChildCount = folder
    ? allChildIds.filter(id => selectedIds.has(id)).length
    : 0;

  const isFolderChecked = folder ? selectedChildCount === allChildIds.length : false;
  const isFolderIndeterminate = folder
    ? selectedChildCount > 0 && selectedChildCount < allChildIds.length
    : false;

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
              ref={el => {
                if (el) el.indeterminate = isFolderIndeterminate;
              }}
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

export function FileTreePickerModal({
  isOpen,
  documents,
  initialDocumentId,
  onClose,
  onLink,
}: FileTreePickerModalProps): JSX.Element | null {
  const { tree, isScanning } = useFileSystemStore();
  const { scanProject } = useFileTree();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetDocumentId, setTargetDocumentId] = useState(initialDocumentId);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !tree) scanProject();
  }, [isOpen, tree, scanProject]);

  useEffect(() => {
    setSelectedIds(new Set());
    setTargetDocumentId(initialDocumentId);
  }, [isOpen, initialDocumentId]);

  const toggleFile = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((folder: FolderNodeDto, select: boolean) => {
    const ids = getAllFileIds(folder);
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const handleLink = () => {
    if (selectedIds.size === 0 || !targetDocumentId) return;
    onLink(Array.from(selectedIds), targetDocumentId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="file-picker-backdrop" onClick={onClose}>
      <div className="file-picker-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="file-picker-header">
          <h5 className="mb-0">Select Code Files</h5>
          <button className="btn btn-ghost" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
        <div className="file-picker-body">
          <div className="mb-3">
            <label className="form-label small fw-medium text-secondary">Target Document</label>
            <select
              className="form-select"
              value={targetDocumentId}
              onChange={e => setTargetDocumentId(e.target.value)}
            >
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
          </div>
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
                      if (selectedIds.size === allIds.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(allIds));
                    }}
                  >
                    {tree && selectedIds.size === getAllFileIds(tree).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <TreeNode
                  node={tree}
                  depth={0}
                  selectedIds={selectedIds}
                  onToggleFile={toggleFile}
                  onToggleFolder={toggleFolder}
                />
              </>
            )}
          </div>
        </div>
        <div className="file-picker-footer">
          <span className="text-secondary small">{selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <div>
            <button className="btn btn-ghost me-2" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={selectedIds.size === 0} onClick={handleLink}>
              Link Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}