import { type JSX, memo } from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { SelectableFileNode } from './SelectableFileNode';

interface SelectableFileTreeProps {
  nodes: ReadonlyArray<FileNodeDto | FolderNodeDto>;
  depth?: number;
}

export const SelectableFileTree = memo(function SelectableFileTree({
  nodes,
  depth = 0,
}: SelectableFileTreeProps): JSX.Element {
  return (
    <div className="file-tree" role="group">
      {nodes.map((node) => (
        <SelectableFileNode key={node.path} node={node} depth={depth} />
      ))}
    </div>
  );
});