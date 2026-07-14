import { app } from 'electron';
import { createMainWindow } from './windows/main-window';
import { registerIpcHandlers } from './ipc/handlers';
import { FileContentReaderAdapter } from '../src/domains/tracking/infrastructure/adapters/file-content-reader.adapter';

let mainWindow: Electron.BrowserWindow | null = null;

app.whenReady().then(() => {
  FileContentReaderAdapter.setUserDataPath(app.getPath('userData'));

  mainWindow = createMainWindow();
  registerIpcHandlers();

  app.on('activate', () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});