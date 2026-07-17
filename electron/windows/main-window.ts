import { app, BrowserWindow, shell } from 'electron';
import path from 'path';

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, '../../build/logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in the default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the application
  if (!app.isPackaged) {
    // Development mode: Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Production mode: Load built index.html from dist folder
    mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'));
  }

  return mainWindow;
}