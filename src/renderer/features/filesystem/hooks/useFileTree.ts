import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FileTreeDto } from '@shared/ipc/filesystem';
import { filesystemApi } from '../api/filesystemIpc';
import { filesystemKeys, TREE_UPDATED_CHANNEL } from '../keys';
import { onIpcEvent } from '../../../shared/lib/ipc';
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
 * File tree query per directory. Renders one directory at a time; folder
 * children are loaded lazily on expand. `TREE_UPDATED` performs a soft
 * invalidation (marks stale, no immediate refetch) so background scans do
 * not cause refetch storms; refetch happens on next mount / window focus.
 */
export function useFileTree(parentPath?: string) {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace?.id ?? '';
  const parent = parentPath ?? '.';

  const treeQuery = useQuery({
    queryKey: filesystemKeys.tree(workspaceId, parent),
    enabled: workspace !== null,
    queryFn: () => filesystemApi.getFileTree(workspaceId, parentPath),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    select: (dto: FileTreeDto): FileTreeDto => {
      if (parent !== '.') return dto;
      return workspace
        ? {
            ...dto,
            root: { ...dto.root, name: getWorkspaceFolderName(workspace.rootPath) },
          }
        : dto;
    },
  });

  useEffect(() => {
    if (!workspaceId) return;
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      void queryClient.invalidateQueries({
        queryKey: filesystemKeys.workspace(workspaceId),
        refetchType: 'none',
      });
    });
    return unsubscribe;
  }, [queryClient, workspaceId]);

  const data = treeQuery.data ?? null;

  return {
    tree: data?.root ?? null,
    totalFiles: data?.totalFiles ?? 0,
    totalFolders: data?.totalFolders ?? 0,
    error: treeQuery.error ? toErrorMessage(treeQuery.error) : null,
    isScanning: treeQuery.isLoading,
  };
}