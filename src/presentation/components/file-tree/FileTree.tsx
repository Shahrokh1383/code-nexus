import { type JSX } from 'react';
import { FileNodeDto, FolderNodeDto } from '../../../../domains/filesystem/application/dto/file-tree.dto';
import { useFileSystemStore, isFolderNode } from '../../stores/filesystem.store';
import { FileNode } from './FileNode';

interface FileTreeProps { nodes: ReadonlyArray<FileNodeDto | FolderNodeDto>; depth?: number; }

export function FileTree({ nodes, depth = 0 }: FileTreeProps): JSX.Element {
  const expandedPaths = useFileSystemStore((s) => s.expandedPaths);

  return (
    <div className="file-tree" role="group">
      {nodes.map((node) => {
        const isFolder = isFolderNode(node);
        const isExpanded = isFolder && expandedPaths.has(node.path);

        return (
          <div key={node.path} className="file-tree__branch">
            <FileNode node={node} depth={depth} />
            {isFolder && isExpanded && node.children.length > 0 && (
              <FileTree nodes={node.children} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}