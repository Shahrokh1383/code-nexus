import { JSX, useState, useMemo } from 'react';
import type { FolderNodeDto, FileNodeDto } from '@shared/ipc/filesystem';
import { isFolderNode, getAllFileIds } from '../hooks/useFileTreePicker';
import { useFileTree } from '../../filesystem';

interface FileTreeNodeProps {
  node: FolderNodeDto | FileNodeDto;
  depth: number;
  selectedIds: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleFolder: (folder: FolderNodeDto, select: boolean) => void;
  expandedFolderIds?: Set<string>;
}

function LazyFolderChildren({
  folderPath,
  depth,
  selectedIds,
  onToggleFile,
  onToggleFolder,
  expandedFolderIds,
}: {
  folderPath: string;
  depth: number;
  selectedIds: Set<string>;
  onToggleFile: (id: string) => void;
  onToggleFolder: (folder: FolderNodeDto, select: boolean) => void;
  expandedFolderIds?: Set<string>;
}): JSX.Element {
  const { tree, isScanning, error } = useFileTree(folderPath);

  if (isScanning) {
    return (
      <div
        className="tree-node text-secondary small"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <i className="fa-solid fa-spinner fa-spin me-2" /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="tree-node text-danger small"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
      </div>
    );
  }
  if (!tree || tree.children.length === 0) {
    return (
      <div
        className="tree-node text-secondary small"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <i className="fa-solid fa-folder-open me-2" /> Empty folder
      </div>
    );
  }

  return (
    <>
      {tree.children.map((child) => (
        <FileTreeNode
          key={child.id}
          node={child}
          depth={depth}
          selectedIds={selectedIds}
          onToggleFile={onToggleFile}
          onToggleFolder={onToggleFolder}
          expandedFolderIds={expandedFolderIds}
        />
      ))}
    </>
  );
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

  const isControlled = expandedFolderIds && expandedFolderIds.size > 0;
  const isExpanded = folder
    ? isControlled
      ? expandedFolderIds!.has(folder.id)
      : localExpanded
    : false;

  const toggleExpand = () => {
    if (!folder) return;
    if (isControlled) return;
    setLocalExpanded((prev) => !prev);
  };

  const allChildIds = useMemo(() => (folder ? getAllFileIds(folder) : []), [folder]);
  const selectedChildCount = folder
    ? allChildIds.filter((id) => selectedIds.has(id)).length
    : 0;
  const isFolderChecked = folder ? selectedChildCount === allChildIds.length : false;
  const isFolderIndeterminate = folder
    ? selectedChildCount > 0 && selectedChildCount < allChildIds.length
    : false;

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
        <div
          className="tree-folder-header"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <label className="tree-folder-checkbox">
            <input
              type="checkbox"
              className="form-check-input"
              checked={isFolderChecked}
              ref={(el) => {
                if (el) el.indeterminate = isFolderIndeterminate;
              }}
              onChange={handleFolderCheckbox}
            />
          </label>
          <span className="tree-folder-icon" onClick={toggleExpand}>
            <i
              className={`fa-solid ${
                isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'
              } me-2`}
            ></i>
            <i
              className={`fa-solid ${
                isExpanded ? 'fa-folder-open' : 'fa-folder'
              } text-warning me-2`}
            ></i>
            <span>{folder.name}</span>
          </span>
        </div>
        {isExpanded && (
          <div className="tree-children">
            {folder.children.length > 0 ? (
              folder.children.map((child) => (
                <FileTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedIds={selectedIds}
                  onToggleFile={onToggleFile}
                  onToggleFolder={onToggleFolder}
                  expandedFolderIds={expandedFolderIds}
                />
              ))
            ) : (
              <LazyFolderChildren
                folderPath={folder.path}
                depth={depth + 1}
                selectedIds={selectedIds}
                onToggleFile={onToggleFile}
                onToggleFolder={onToggleFolder}
                expandedFolderIds={expandedFolderIds}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return <></>;
}