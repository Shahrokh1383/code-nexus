import { type JSX, memo } from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { useFileSystemStore, isFolderNode } from '../stores/filesystem.store';
import { FileNode } from './FileNode';
import { useFileTree } from '../hooks/useFileTree';

interface SelectableFileNodeProps {
  node: FileNodeDto | FolderNodeDto;
  depth: number;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
}

export const SelectableFileNode = memo(function SelectableFileNode({
  node,
  depth,
  selectedPaths,
  onToggleSelect,
}: SelectableFileNodeProps): JSX.Element {
  const isFolder = isFolderNode(node);
  const isExpanded = useFileSystemStore((s) => s.expandedPaths.has(node.path));
  const isSelected = selectedPaths.has(node.path);

  const handleChange = (): void => {
    onToggleSelect(node.path);
  };

  return (
    <div className="file-tree__branch">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label
          className="cn-checkbox-label"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="cn-checkbox"
            checked={isSelected}
            onChange={handleChange}
          />
        </label>
        <div style={{ flex: 1 }}>
          <FileNode node={node} depth={depth} isExpanded={isExpanded} />
        </div>
      </div>
      {isFolder && isExpanded && (
        <FolderChildren
          folderPath={node.path}
          depth={depth + 1}
          selectedPaths={selectedPaths}
          onToggleSelect={onToggleSelect}
        />
      )}
    </div>
  );
});

interface FolderChildrenProps {
  folderPath: string;
  depth: number;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
}

function FolderChildren({
  folderPath,
  depth,
  selectedPaths,
  onToggleSelect,
}: FolderChildrenProps): JSX.Element {
  const { tree } = useFileTree(folderPath);
  if (!tree) {
    return (
      <div
        className="file-tree__loading"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        aria-busy="true"
      >
        Loading…
      </div>
    );
  }
  if (tree.children.length === 0) return <></>;
  return (
    <div className="file-tree" role="group">
      {tree.children.map((child) => (
        <SelectableFileNode
          key={child.path}
          node={child}
          depth={depth}
          selectedPaths={selectedPaths}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}