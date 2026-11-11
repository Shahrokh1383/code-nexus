import { BrowserWindow } from 'electron';
import { LINKING_CHANNELS } from '@shared/ipc/linking';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';

/**
 * Renderer realtime bridge for the linking module. Mirrors the filesystem
 * module's RendererBridge (same 300 ms debounce) so the renderer can
 * invalidate its linking queries on any persisted link change without
 * polling. Push channel is 'linking:updated', whitelisted via EVENT_CHANNELS.
 */
export class LinkingBridge {
  private static readonly DEBOUNCE_MS = 300;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly isSessionActive: () => boolean
  ) {}

  subscribe(): () => void {
    const offDocCreated = this.eventBus.on('DocumentLinkCreated', () => this.scheduleNotify());
    const offDocBroken = this.eventBus.on('DocumentLinkBroken', () => this.scheduleNotify());
    const offLinkCreated = this.eventBus.on('LinkCreated', () => this.scheduleNotify());
    const offLinkBroken = this.eventBus.on('LinkBroken', () => this.scheduleNotify());
    const offMigrated = this.eventBus.on('LinksMigrated', () => this.scheduleNotify());
    const offDocDeleted = this.eventBus.on('DocumentDeleted', () => this.scheduleNotify());
    return () => {
      offDocCreated();
      offDocBroken();
      offLinkCreated();
      offLinkBroken();
      offMigrated();
      offDocDeleted();
    };
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private scheduleNotify(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (!this.isSessionActive()) return;
      try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && !windows[0].isDestroyed()) {
          windows[0].webContents.send(LINKING_CHANNELS.UPDATED);
        }
      } catch (error) {
        this.logger.warn('failed to push linking update', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, LinkingBridge.DEBOUNCE_MS);
  }
}