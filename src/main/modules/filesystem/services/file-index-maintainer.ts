import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import { validateRelativePath } from '../domain/file-path';
import type { IgnorePattern } from '../domain/ignore-pattern';
import type { FileIndexStore } from '../infrastructure/file-index-store';
import { DEFAULT_IGNORED_SEGMENTS, type WatcherEvent } from '../infrastructure/chokidar-watcher';

export class FileIndexMaintainer {
  private static readonly YIELD_EVERY = 200;
  constructor(
    private readonly store: FileIndexStore,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly ignorePatterns: readonly IgnorePattern[]
  ) {}

  async applyBatch(events: readonly WatcherEvent[]): Promise<void> {
    let processed = 0;
    for (const event of events) {
      try {
        await this.processEvent(event);
      } catch (error) {
        this.logger.debug('watcher event skipped', {
          type: event.type,
          path: event.relativePath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      processed += 1;
      if (processed >= FileIndexMaintainer.YIELD_EVERY) {
        processed = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
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
        if (this.isIgnored(relativePath)) return;
        if (await this.store.upsertFile(relativePath)) {
          this.eventBus.emit('FileDiscovered', { path: relativePath, isDirectory: false });
        }
        return;

      case 'change':
        if (this.isIgnored(relativePath)) return;
        if (await this.store.findByPath(relativePath)) return;
        if (await this.store.upsertFile(relativePath)) {
          this.eventBus.emit('FileDiscovered', { path: relativePath, isDirectory: false });
        }
        return;

      case 'unlink':
        await this.store.deleteByPath(relativePath);
        this.eventBus.emit('FileDeleted', { path: relativePath });
        return;

      case 'addDir':
        if (this.isIgnored(relativePath)) return;
        if (await this.store.upsertFolder(relativePath)) {
          this.eventBus.emit('FileDiscovered', { path: relativePath, isDirectory: true });
        }
        return;

      case 'unlinkDir':
        await this.store.deleteByPath(relativePath);
        this.eventBus.emit('FileDeleted', { path: relativePath });
        return;
    }
  }

  private isIgnored(relativePath: string): boolean {
    // Check default ignored segments (node_modules, .git, etc.)
    if (relativePath.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s))) {
      return true;
    }
    
    // Check user-defined ignore patterns
    return this.ignorePatterns.some((pattern) => {
      try {
        return pattern.matches(relativePath);
      } catch {
        return false;
      }
    });
  }
}