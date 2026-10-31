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
 * File tree query per directory. Renders one directory at a time; folder
 * children are loaded lazily on expand. Realtime freshness is owned once
 * at the page level (`useFilesystemTreeUpdates`) — the previous per-instance
 * `TREE_UPDATED` subscription created one listener per expanded folder,
 * multiplying invalidations per push and causing refetch storms.
 *
 * `refetchOnWindowFocus` is disabled: in Electron this fires on every
 * alt-tab and devtools toggle, and each firing refetched every expanded
 * folder. Realtime updates are handled by the shared subscription instead.
 */
export function useFileTree(parentPath?: string) {
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id ?? '';
  const parent = parentPath ?? '.';

  const treeQuery = useQuery({
    queryKey: filesystemKeys.tree(workspaceId, parent),
    enabled: workspace !== null,
    queryFn: () => filesystemApi.getFileTree(workspaceId, parentPath),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
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

  const data = treeQuery.data ?? null;

  return {
    tree: data?.root ?? null,
    totalFiles: data?.totalFiles ?? 0,
    totalFolders: data?.totalFolders ?? 0,
    error: treeQuery.error ? toErrorMessage(treeQuery.error) : null,
    isScanning: treeQuery.isLoading,
  };
}