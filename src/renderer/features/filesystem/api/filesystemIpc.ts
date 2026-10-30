import { ipcInvoke } from '../../../shared/lib/ipc';
import { FILESYSTEM_CHANNELS } from '@shared/ipc/filesystem';
import type { FileTreeDto } from '@shared/ipc/filesystem';

/**
 * File-system feature IPC client — the only place this feature talks to IPC.
 */
export const filesystemApi = {
  getFileTree: (workspaceId: string): Promise<FileTreeDto> =>
    ipcInvoke(FILESYSTEM_CHANNELS.GET_FILE_TREE, { workspaceId }),

  getIgnoredFiles: (workspaceId: string): Promise<string[]> =>
    ipcInvoke(FILESYSTEM_CHANNELS.GET_IGNORED_FILES, { workspaceId }),

  addIgnorePattern: (workspaceId: string, pattern: string): Promise<void> =>
    ipcInvoke(FILESYSTEM_CHANNELS.ADD_IGNORE_PATTERN, { workspaceId, pattern }),

  removeIgnorePattern: (workspaceId: string, pattern: string): Promise<void> =>
    ipcInvoke(FILESYSTEM_CHANNELS.REMOVE_IGNORE_PATTERN, { workspaceId, pattern }),
};