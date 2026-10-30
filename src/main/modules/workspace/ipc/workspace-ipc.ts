import { WORKSPACE_CHANNELS } from '@shared/ipc/workspace';
import type { ServiceContainer } from '../../../kernel/service-container';
import type { Logger } from '../../../shared/logger/logger';
import { createIpcHandler } from '../../../shared/ipc/handler';
import { WorkspaceServiceToken } from '../services/contracts/WorkspaceServiceContract';
import {
  initializeWorkspaceSchema,
  getWorkspaceSchema,
  changeWorkspaceScopeSchema,
  closeWorkspaceSchema,
  removeRecentWorkspaceSchema,
} from './schemas';

/**
 * Thin workspace IPC registration (Constitution §11): validate → resolve
 * service → one method call. No business logic here.
 */
export function registerWorkspaceIpc(container: ServiceContainer, logger: Logger): void {
  const service = () => container.resolve(WorkspaceServiceToken);

  createIpcHandler(logger, {
    channel: WORKSPACE_CHANNELS.INITIALIZE,
    schema: initializeWorkspaceSchema,
    execute: ({ rootPath }) => service().initialize(rootPath),
  });

  createIpcHandler(logger, {
    channel: WORKSPACE_CHANNELS.GET_WORKSPACE,
    schema: getWorkspaceSchema,
    execute: ({ workspaceId }) => service().getWorkspace(workspaceId),
  });

  createIpcHandler(logger, {
    channel: WORKSPACE_CHANNELS.CHANGE_SCOPE,
    schema: changeWorkspaceScopeSchema,
    execute: ({ workspaceId, newRootPath }) =>
      service().changeWorkspaceScope(workspaceId, newRootPath),
  });

  createIpcHandler(logger, {
    channel: WORKSPACE_CHANNELS.CLOSE,
    schema: closeWorkspaceSchema,
    execute: ({ workspaceId }) => service().closeWorkspace(workspaceId),
  });

  createIpcHandler(logger, {
    channel: WORKSPACE_CHANNELS.GET_RECENT_WORKSPACES,
    execute: () => service().getRecentWorkspaces(),
  });

  createIpcHandler(logger, {
    channel: WORKSPACE_CHANNELS.REMOVE_RECENT_WORKSPACE,
    schema: removeRecentWorkspaceSchema,
    execute: ({ workspaceId }) => service().removeRecentWorkspace(workspaceId),
  });
}