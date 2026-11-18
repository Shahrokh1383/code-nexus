import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import type { Logger } from '../shared/logger/logger';

/**
 * The only component allowed to create BrowserWindow instances
 * Security flags are immutable: contextIsolation,
 * no nodeIntegration, sandboxed renderer.
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  constructor(private readonly logger: Logger) {}

  createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow;
    }

    const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'icon.ico')
      : join(__dirname, '../build/icon.ico');

    const window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      show: false,
      icon: iconPath,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // Show when ready to prevent visual flash.
    window.once('ready-to-show', () => {
      window.show();
    });

    // External links open in the OS browser — http/https only.
    window.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const protocol = new URL(url).protocol;
        if (protocol === 'http:' || protocol === 'https:') {
          void shell.openExternal(url);
        }
      } catch {
        this.logger.warn('blocked malformed external link', { url });
      }
      return { action: 'deny' };
    });

    const logLoadFailure = (error: unknown): void => {
      this.logger.error('main window content load failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    };

    // Bundled main is flat at dist-electron/main.js, so the app root
    // (dist/, build/) is exactly one level up — not two.
    if (!app.isPackaged) {
      void window.loadURL('http://localhost:5173').catch(logLoadFailure);
    } else {
      void window.loadFile(join(__dirname, '../dist/index.html')).catch(logLoadFailure);
    }

    this.mainWindow = window;
    return window;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow && !this.mainWindow.isDestroyed() ? this.mainWindow : null;
  }
}