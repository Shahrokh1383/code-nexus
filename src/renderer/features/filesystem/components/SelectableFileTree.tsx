import { type JSX } from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { useFileSystemStore, isFolderNode } from '../stores/filesystem.store';
import { SelectableFileNode } from './SelectableFileNode';
import { useFileTree } from '../hooks/useFileTree';

interface SelectableFileTreeProps {
  nodes: ReadonlyArray<FileNodeDto | FolderNodeDto>;
  depth?: number;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
}

export function SelectableFileTree({
  nodes,
  depth = 0,
  selectedPaths,
  onToggleSelect,
}: SelectableFileTreeProps): JSX.Element {
  const expandedPaths = useFileSystemStore((s) => s.expandedPaths);

  return (
    <div className="file-tree" role="group">
      {nodes.map((node) => {
        const isFolder = isFolderNode(node);
        const isExpanded = isFolder && expandedPaths.has(node.path);

        return (
          <div key={node.path} className="file-tree__branch">
            <SelectableFileNode
              node={node}
              depth={depth}
              isSelected={selectedPaths.has(node.path)}
              onToggleSelect={onToggleSelect}
            />
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
      })}
    </div>
  );
}

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
    <SelectableFileTree
      nodes={tree.children}
      depth={depth}
      selectedPaths={selectedPaths}
      onToggleSelect={onToggleSelect}
    />
  );
}