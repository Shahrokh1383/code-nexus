/**
 * Query key factory for the linking feature (Constitution §18).
 * Workspace-scoped so a workspace switch partitions cache naturally.
 */
export const linkingKeys = {
  all: ['linking'] as const,
  workspace: (workspaceId: string) => [...linkingKeys.all, workspaceId] as const,
  unlinked: (workspaceId: string) =>
    [...linkingKeys.workspace(workspaceId), 'unlinked'] as const,
  codeLinks: (workspaceId: string, documentId: string) =>
    [...linkingKeys.workspace(workspaceId), 'codeLinks', documentId] as const,
  documentLinks: (workspaceId: string, documentId: string) =>
    [...linkingKeys.workspace(workspaceId), 'documentLinks', documentId] as const,
};