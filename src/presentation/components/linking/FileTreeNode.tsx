import { JSX, useState, useMemo } from 'react';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';
import { isFolderNode, getAllFileIds } from '../../hooks/linking/useFileTreePicker';

interface FileTreeNodeProps {
  node: FolderNodeDto | FileNodeDto;
  depth: number;
  selectedIds: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleFolder: (folder: FolderNodeDto, select: boolean) => void;
  expandedFolderIds?: Set<string>;
}

export function FileTreeNode({ 
  node, 
  depth, 
  selectedIds, 
  onToggleFile, 
  onToggleFolder,
  expandedFolderIds,
}: FileTreeNodeProps): JSX.Element {
  const folder = isFolderNode(node) ? node : null;
  const file = !folder ? (node as FileNodeDto) : null;
  
  const [localExpanded, setLocalExpanded] = useState(false);
  
  // Determine if expanded: external control if provided and non-empty, else local state
  const isControlled = expandedFolderIds && expandedFolderIds.size > 0;
  const isExpanded = folder
    ? (isControlled ? expandedFolderIds!.has(folder.id) : localExpanded)
    : false;

  const toggleExpand = () => {
    if (!folder) return;
    if (isControlled) return; // don't allow manual toggle when search results are forcing expansion
    setLocalExpanded(prev => !prev);
  };

  const allChildIds = useMemo(() => (folder ? getAllFileIds(folder) : []), [folder]);
  const selectedChildCount = folder ? allChildIds.filter(id => selectedIds.has(id)).length : 0;
  const isFolderChecked = folder ? selectedChildCount === allChildIds.length : false;
  const isFolderIndeterminate = folder ? selectedChildCount > 0 && selectedChildCount < allChildIds.length : false;

  const handleFolderCheckbox = () => {
    if (!folder) return;
    onToggleFolder(folder, !isFolderChecked);
  };

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
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`}></i>
            <i className={`fa-solid ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-warning me-2`}></i>
            <span>{folder.name}</span>
          </span>
        </div>
        {isExpanded && (
          <div className="tree-children">
            {folder.children.map(child => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedIds={selectedIds}
                onToggleFile={onToggleFile}
                onToggleFolder={onToggleFolder}
                expandedFolderIds={expandedFolderIds}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <></>;
}