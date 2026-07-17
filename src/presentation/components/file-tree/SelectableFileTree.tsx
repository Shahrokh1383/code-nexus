import { type JSX } from 'react';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { useFileSystemStore, isFolderNode } from '../../stores/filesystem.store';
import { SelectableFileNode } from './SelectableFileNode';

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
            {isFolder && isExpanded && node.children.length > 0 && (
              <SelectableFileTree
                nodes={node.children}
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