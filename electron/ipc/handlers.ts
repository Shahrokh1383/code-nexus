import { ipcMain, dialog } from 'electron';
import { IpcChannels } from './channels';
import { registerProjectHandlers } from './handlers/project-handlers';
import { registerFilesystemHandlers } from './handlers/filesystem-handlers';
import { registerDocumentationHandlers } from './handlers/documentation-handlers';
import { registerTrackingHandlers } from './handlers/tracking-handlers';
import { registerLinkingHandlers } from './handlers/linking-handlers';

/**
 * Registers all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  // Infrastructure‑level handlers (no domain imports)
  ipcMain.handle(IpcChannels.DIALOG_OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    if (result.canceled) {
      return { success: true, data: [] };
    }

    return { success: true, data: result.filePaths };
  });

  // Domain‑specific handlers
  registerProjectHandlers();
  registerFilesystemHandlers();
  registerDocumentationHandlers();
  registerTrackingHandlers();
  registerLinkingHandlers();
}