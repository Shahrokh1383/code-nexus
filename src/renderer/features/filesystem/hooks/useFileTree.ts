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
 * File tree query + realtime refresh. Subscribes to `filesystem:tree-updated`
 * and invalidates the tree cache, replacing the legacy manual refetch flow.
 */
export function useFileTree() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace?.id ?? '';

  const treeQuery = useQuery({
    queryKey: filesystemKeys.tree(workspaceId),
    enabled: workspace !== null,
    queryFn: () => filesystemApi.getFileTree(workspaceId),
    select: (dto: FileTreeDto): FileTreeDto =>
      workspace
        ? {
            ...dto,
            root: {
              ...dto.root,
              name: getWorkspaceFolderName(workspace.rootPath),
            },
          }
        : dto,
  });

  useEffect(() => {
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      void queryClient.invalidateQueries({ queryKey: filesystemKeys.all });
    });
    return unsubscribe;
  }, [queryClient]);

  const data = treeQuery.data ?? null;

  return {
    tree: data?.root ?? null,
    totalFiles: data?.totalFiles ?? 0,
    totalFolders: data?.totalFolders ?? 0,
    error: treeQuery.error ? toErrorMessage(treeQuery.error) : null,
    isScanning: treeQuery.isLoading,
  };
}