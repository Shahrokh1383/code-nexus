/**
 * Query key factory for the documentation feature. Every key is scoped by
 * workspace id so cache entries from different workspaces never collide and
 * a workspace switch naturally partitions invalidation.
 */
export const documentationKeys = {
  all: ['documentation'] as const,
  workspace: (workspaceId: string) => [...documentationKeys.all, workspaceId] as const,
  documents: (workspaceId: string) => [...documentationKeys.workspace(workspaceId), 'documents'] as const,
  orphans: (workspaceId: string) => [...documentationKeys.workspace(workspaceId), 'orphans'] as const,
  deleted: (workspaceId: string) => [...documentationKeys.workspace(workspaceId), 'deleted'] as const,
};