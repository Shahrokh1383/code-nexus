import { BrowserWindow } from 'electron';
import { FILESYSTEM_CHANNELS } from '@shared/ipc/filesystem';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';

/**
 * Renderer realtime bridge: file-system events → 300 ms debounce →
 * `filesystem:tree-updated` push to the main window. Channel name and
 * debounce window are preserved from the legacy watcher lifecycle.
 */
export class RendererBridge {
  private static readonly DEBOUNCE_MS = 300;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly isSessionActive: () => boolean
  ) {}

  subscribe(): () => void {
    const offDiscovered = this.eventBus.on('FileDiscovered', () => this.scheduleNotify());
    const offModified = this.eventBus.on('FileModified', () => this.scheduleNotify());
    const offDeleted = this.eventBus.on('FileDeleted', () => this.scheduleNotify());
    return () => {
      offDiscovered();
      offModified();
      offDeleted();
    };
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private scheduleNotify(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (!this.isSessionActive()) {
        return;
      }
      try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && !windows[0].isDestroyed()) {
          windows[0].webContents.send(FILESYSTEM_CHANNELS.TREE_UPDATED);
        }
      } catch (error) {
        this.logger.warn('failed to push tree update', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, RendererBridge.DEBOUNCE_MS);
  }
}