import { app } from 'electron';
import { createMainWindow } from './windows/main-window';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: Electron.BrowserWindow | null = null;

app.whenReady().then(() => {
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
