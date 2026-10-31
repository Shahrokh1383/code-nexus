import { memo, useMemo, type JSX } from 'react';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';
import { useFileSystemStore, isFolderNode } from '../stores/filesystem.store';
import { FileIcon } from './FileIcon';

interface FileNodeProps {
  node: FileNodeDto | FolderNodeDto;
  depth: number;
  isExpanded: boolean;
}

const formatRelativeTime = (dateString: string): string => {
  const diffDays = Math.floor(
    (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
};

export const FileNode = memo(function FileNode({
  node,
  depth,
  isExpanded,
}: FileNodeProps): JSX.Element {
  const toggleFolder = useFileSystemStore((s) => s.toggleFolder);

  const isFolder = isFolderNode(node);
  const lastModified = isFolder ? '' : (node as FileNodeDto).lastModified;
  const displayTime = useMemo(
    () => (lastModified ? formatRelativeTime(lastModified) : ''),
    [lastModified]
  );

  return (
    <div
      className="file-node"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => isFolder && toggleFolder(node.path)}
      role="treeitem"
      aria-expanded={isFolder ? isExpanded : undefined}
    >
      <div className="file-node__indicator">
        {isFolder && <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} fa-xs`} />}
      </div>
      <FileIcon name={node.name} isDirectory={isFolder} isExpanded={isExpanded} />
      <span className="file-node__name">{node.name}</span>

      {!isFolder && (
        <div className="file-node__meta">
          <span className="file-node__date">{displayTime}</span>
        </div>
      )}
    </div>
  );
});