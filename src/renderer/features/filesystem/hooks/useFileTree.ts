import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FileTreeDto } from '@shared/ipc/filesystem';
import { filesystemApi } from '../api/filesystemIpc';
import { filesystemKeys } from '../keys';
import { useWorkspace } from '../../workspace';

const getWorkspaceFolderName = (rootPath: string): string => {
  const normalized = rootPath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'Workspace';
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * File tree query per directory. Children load lazily via `FolderChildren`.
 * `select` is memoized on `(parent, folderName)` so the resulting `tree`
 * object is ref-stable across renders — prevents spurious full-tree
 * re-renders when the workspace object ref happens to change.
 */
export function useFileTree(parentPath?: string) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? '';
  const parent = parentPath ?? '.';
  const rootPath = workspace?.rootPath ?? '';

  const folderName = useMemo(
    () => (rootPath ? getWorkspaceFolderName(rootPath) : 'Workspace'),
    [rootPath]
  );

  const select = useCallback(
    (dto: FileTreeDto): FileTreeDto => {
      if (parent !== '.') return dto;
      return { ...dto, root: { ...dto.root, name: folderName } };
    },
    [parent, folderName]
  );

  const treeQuery = useQuery({
    queryKey: filesystemKeys.tree(workspaceId, parent),
    enabled: workspace !== null,
    queryFn: () => filesystemApi.getFileTree(workspaceId, parentPath),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    select,
  });

  const data = treeQuery.data ?? null;

  return {
    tree: data?.root ?? null,
    totalFiles: data?.totalFiles ?? 0,
    totalFolders: data?.totalFolders ?? 0,
    error: treeQuery.error ? toErrorMessage(treeQuery.error) : null,
    isScanning: treeQuery.isLoading,
  };
}