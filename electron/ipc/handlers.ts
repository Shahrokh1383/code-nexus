import { ipcMain } from 'electron';
import { IpcChannels } from './channels';

/**
 * Registers all IPC handlers for the main process.
 * Phase 1+: Add concrete handlers here as Bounded Contexts are implemented.
 */
export function registerIpcHandlers(): void {
  // Placeholder: concrete handlers will be registered in subsequent phases.
  void ipcMain;
  void IpcChannels;
}
