import { ipcInvoke } from '../../../shared/lib/ipc';
import { WORKSPACE_CHANNELS } from '@shared/ipc/workspace';
import { SYSTEM_CHANNELS } from '@shared/ipc/system';
import type { WorkspaceDto, RecentWorkspaceDto } from '@shared/ipc/workspace';

/**
 * Workspace feature IPC client — the only place this feature talks to IPC.
 */
export const workspaceApi = {
  initialize: (rootPath: string): Promise<WorkspaceDto> =>
    ipcInvoke(WORKSPACE_CHANNELS.INITIALIZE, { rootPath }),

  getWorkspace: (workspaceId: string): Promise<WorkspaceDto> =>
    ipcInvoke(WORKSPACE_CHANNELS.GET_WORKSPACE, { workspaceId }),

  closeWorkspace: (workspaceId: string): Promise<void> =>
    ipcInvoke(WORKSPACE_CHANNELS.CLOSE, { workspaceId }),

  getRecentWorkspaces: (): Promise<RecentWorkspaceDto[]> =>
    ipcInvoke(WORKSPACE_CHANNELS.GET_RECENT_WORKSPACES),

  removeRecentWorkspace: (workspaceId: string): Promise<void> =>
    ipcInvoke(WORKSPACE_CHANNELS.REMOVE_RECENT_WORKSPACE, { workspaceId }),

  openFolderDialog: (): Promise<string[]> => ipcInvoke(SYSTEM_CHANNELS.OPEN_FOLDER),
};