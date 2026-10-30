import { type JSX, memo } from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { FileNode } from './FileNode';

interface SelectableFileNodeProps {
  node: FileNodeDto | FolderNodeDto;
  depth: number;
  isSelected: boolean;
  onToggleSelect: (path: string) => void;
}

export const SelectableFileNode = memo(function SelectableFileNode({
  node,
  depth,
  isSelected,
  onToggleSelect,
}: SelectableFileNodeProps): JSX.Element {
  const handleChange = (): void => {
    onToggleSelect(node.path);
  };

  return (
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
        <FileNode node={node} depth={depth} />
      </div>
    </div>
  );
});