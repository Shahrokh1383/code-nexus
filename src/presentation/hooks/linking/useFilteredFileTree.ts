import { useMemo } from 'react';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';

function filterTree(node: FolderNodeDto | FileNodeDto, searchTermLower: string): FolderNodeDto | FileNodeDto | null {
  if ('children' in node) {
    // FolderNodeDto
    const filteredChildren = node.children
      .map(child => filterTree(child, searchTermLower))
      .filter((child): child is FolderNodeDto | FileNodeDto => child !== null);
    if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTermLower)) {
      return { ...node, children: filteredChildren };
    }
    return null;
  } else {
    // FileNodeDto
    return node.name.toLowerCase().includes(searchTermLower) ? { ...node } : null;
  }
}

export function useFilteredFileTree(
  tree: FolderNodeDto | null | undefined,
  searchTerm: string
): FolderNodeDto | null {
  return useMemo(() => {
    if (!tree) return null;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tree; // no filter
    const filtered = filterTree(tree, term);
    return (filtered as FolderNodeDto) ?? null;
  }, [tree, searchTerm]);
}

export function getAllFolderIds(node: FolderNodeDto | FileNodeDto): string[] {
  if ('children' in node) {
    return [node.id, ...node.children.flatMap(getAllFolderIds)];
  }
  return [];
}