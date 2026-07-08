import { ipcMain } from 'electron';
import { IpcChannels } from './channels';
import { registerProjectHandlers } from './handlers/project-handlers';

/**
 * Registers all IPC handlers for the main process.
 */
export function registerIpcHandlers(): void {
  registerProjectHandlers();

  // Placeholder: additional context handlers will be registered in subsequent phases.
  void ipcMain;
  void IpcChannels;
}