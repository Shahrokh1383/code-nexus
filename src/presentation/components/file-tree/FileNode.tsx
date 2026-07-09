import { type JSX, memo } from 'react';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { useFileSystemStore, isFolderNode } from '../../stores/filesystem.store';
import { FileIcon } from './FileIcon';

interface FileNodeProps { node: FileNodeDto | FolderNodeDto; depth: number; }

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatRelativeTime = (dateString: string): string => {
  const diffDays = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
};

export const FileNode = memo(function FileNode({ node, depth }: FileNodeProps): JSX.Element {
  const toggleFolder = useFileSystemStore((s) => s.toggleFolder);
  const expandedPaths = useFileSystemStore((s) => s.expandedPaths);
  const changedPaths = useFileSystemStore((s) => s.changedPaths);

  const isFolder = isFolderNode(node);
  const isExpanded = isFolder && expandedPaths.has(node.path);
  const isChanged = changedPaths.has(node.path);

  return (
    <div 
      className={`file-node ${isChanged ? 'file-node--changed' : ''}`}
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
          <span className="file-node__size">{formatBytes((node as FileNodeDto).size)}</span>
          <span className="file-node__date">{formatRelativeTime((node as FileNodeDto).lastModified)}</span>
        </div>
      )}
    </div>
  );
});