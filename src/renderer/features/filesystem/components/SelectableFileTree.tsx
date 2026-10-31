import { type JSX, memo } from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { SelectableFileNode } from './SelectableFileNode';

interface SelectableFileTreeProps {
  nodes: ReadonlyArray<FileNodeDto | FolderNodeDto>;
  depth?: number;
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
}

export const SelectableFileTree = memo(function SelectableFileTree({
  nodes,
  depth = 0,
  selectedPaths,
  onToggleSelect,
}: SelectableFileTreeProps): JSX.Element {
  return (
    <div className="file-tree" role="group">
      {nodes.map((node) => (
        <SelectableFileNode
          key={node.path}
          node={node}
          depth={depth}
          selectedPaths={selectedPaths}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
});