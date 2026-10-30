import { createServiceToken, type ServiceToken } from '../../../../kernel/service-container';
import type {
  RecentWorkspaceDto,
  WorkspaceDto,
} from '@shared/ipc/workspace';

/**
 * Public workspace-module contract. The file-system module
 * resolves this for config access (ignore patterns); IPC handlers resolve it
 * for channel execution.
 */
export interface WorkspaceServiceContract {
  initialize(rootPath: string): Promise<WorkspaceDto>;
  getWorkspace(workspaceId: string): Promise<WorkspaceDto>;
  changeWorkspaceScope(workspaceId: string, newRootPath: string): Promise<void>;
  closeWorkspace(workspaceId: string): Promise<void>;
  getRecentWorkspaces(): Promise<RecentWorkspaceDto[]>;
  removeRecentWorkspace(workspaceId: string): Promise<void>;
  getIgnorePatterns(workspaceId: string): Promise<string[]>;
  addIgnorePattern(workspaceId: string, pattern: string): Promise<void>;
  removeIgnorePattern(workspaceId: string, pattern: string): Promise<void>;
}

export const WorkspaceServiceToken: ServiceToken<WorkspaceServiceContract> =
  createServiceToken<WorkspaceServiceContract>('WorkspaceService');