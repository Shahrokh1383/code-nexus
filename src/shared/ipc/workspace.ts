/**
 * Workspace (project) context IPC contract — channel names + pure DTO types.
 * Must stay free of Zod, Node.js imports, and runtime logic 
 */
export const WORKSPACE_CHANNELS = {
  INITIALIZE: 'project:initialize',
  GET_WORKSPACE: 'project:get-workspace',
  CHANGE_SCOPE: 'project:change-scope',
  CLOSE: 'project:close',
  GET_RECENT_WORKSPACES: 'project:get-recent-workspaces',
  REMOVE_RECENT_WORKSPACE: 'project:remove-recent-workspace',
} as const;

export interface WorkspaceDto {
  readonly id: string;
  readonly rootPath: string;
  readonly metadataFolderPath: string;
  readonly createdAt: string;
  readonly lastScanAt: string | null;
}

export interface RecentWorkspaceDto {
  readonly id: string;
  readonly rootPath: string;
  readonly lastOpened: string;
}

export interface InitializeWorkspaceInput {
  readonly rootPath: string;
}

export interface GetWorkspaceInput {
  readonly workspaceId: string;
}

export interface ChangeWorkspaceScopeInput {
  readonly workspaceId: string;
  readonly newRootPath: string;
}

export interface CloseWorkspaceInput {
  readonly workspaceId: string;
}

export interface RemoveRecentWorkspaceInput {
  readonly workspaceId: string;
}