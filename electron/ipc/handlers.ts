import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IpcChannels } from './channels';
import { registerProjectHandlers } from './handlers/project-handlers';
import { registerFilesystemHandlers } from './handlers/filesystem-handlers';
import { registerDocumentationHandlers } from './handlers/documentation';
import { registerTrackingHandlers } from './handlers/tracking-handlers';
import { registerLinkingHandlers } from './handlers/linking-handlers';

export function registerIpcHandlers(mainWindow?: BrowserWindow): void {
  ipcMain.handle(IpcChannels.DIALOG_OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled) return { success: true, data: [] };
    return { success: true, data: result.filePaths };
  });

  registerProjectHandlers();
  registerFilesystemHandlers();
  registerDocumentationHandlers();
  registerTrackingHandlers(mainWindow);
  registerLinkingHandlers();
}