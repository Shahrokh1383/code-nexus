import { FILESYSTEM_CHANNELS } from '@shared/ipc/filesystem';

/**
 * Query key factory for the file-system feature.
 * The tree key doubles as the invalidation target for tree-updated pushes.
 * `trees` is the workspace-scoped prefix used for filtering; `tree` is the
 * specific per-directory query key.
 */
export const filesystemKeys = {
  all: ['filesystem'] as const,
  workspace: (workspaceId: string) => ['filesystem', workspaceId] as const,
  trees: (workspaceId: string) => ['filesystem', workspaceId, 'tree'] as const,
  tree: (workspaceId: string, parentPath: string = '.') =>
    ['filesystem', workspaceId, 'tree', parentPath] as const,
  patterns: (workspaceId: string) =>
    ['filesystem', workspaceId, 'patterns'] as const,
};

export const TREE_UPDATED_CHANNEL = FILESYSTEM_CHANNELS.TREE_UPDATED;