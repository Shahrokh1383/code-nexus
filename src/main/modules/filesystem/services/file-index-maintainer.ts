import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import { validateRelativePath } from '../domain/file-path';
import type { IgnorePattern } from '../domain/ignore-pattern';
import type { FileIndexStore } from '../infrastructure/file-index-store';
import type { WatcherEvent } from '../infrastructure/chokidar-watcher';

/**
 * Applies watcher event batches to the file index and emits the
 * corresponding domain events. Ports the legacy FileChangeReactionSaga's
 * file-system-side behavior with its exact per-event semantics:
 * `.doclink` paths always skipped; ignore check on discover/modify only
 * (never on delete); upsert inserts when missing.
 */
export class FileIndexMaintainer {
  constructor(
    private readonly store: FileIndexStore,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly ignorePatterns: readonly IgnorePattern[]
  ) {}

  async applyBatch(events: readonly WatcherEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.processEvent(event);
      } catch (error) {
        // Paths failing validation (e.g. events outside the workspace root)
        // are skipped silently, like the legacy adapter did.
        this.logger.debug('watcher event skipped', {
          type: event.type,
          path: event.relativePath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async processEvent(event: WatcherEvent): Promise<void> {
    const relativePath = validateRelativePath(event.relativePath);

    if (relativePath.startsWith('.doclink/') || relativePath === '.doclink') {
      return;
    }

    switch (event.type) {
      case 'add':
        if (this.isIgnored(relativePath)) {
          return;
        }
        await this.store.upsertFile(relativePath);
        this.eventBus.emit('FileDiscovered', { path: relativePath, isDirectory: false });
        return;

      case 'change':
        if (this.isIgnored(relativePath)) {
          return;
        }
        await this.store.upsertFile(relativePath);
        this.eventBus.emit('FileModified', { path: relativePath });
        return;

      case 'unlink':
        await this.store.deleteByPath(relativePath);
        this.eventBus.emit('FileDeleted', { path: relativePath });
        return;

      case 'addDir':
        if (this.isIgnored(relativePath)) {
          return;
        }
        await this.store.upsertFolder(relativePath);
        this.eventBus.emit('FileDiscovered', { path: relativePath, isDirectory: true });
        return;

      case 'unlinkDir':
        await this.store.deleteByPath(relativePath);
        this.eventBus.emit('FileDeleted', { path: relativePath });
        return;
    }
  }

  private isIgnored(relativePath: string): boolean {
    return this.ignorePatterns.some((pattern) => {
      try {
        return pattern.matches(relativePath);
      } catch {
        return false;
      }
    });
  }
}