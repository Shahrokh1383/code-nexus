import chokidar, { type FSWatcher } from 'chokidar';
import type { Logger } from '../../../shared/logger/logger';
import { PathUtils } from '../../../shared/utils/path-utils';
import type { IgnorePattern } from '../domain/ignore-pattern';

export type WatcherEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface WatcherEvent {
  type: WatcherEventType;
  relativePath: string;
}

/**
 * Chokidar adapter — 300 ms debounced batching, then sequential delivery to
 * the injected batch handler. Ports the legacy adapter verbatim, including
 * the ignore-pattern → chokidar-glob conversion rules; the only behavioral
 * fix is awaiting `watcher.close()` on stop to eliminate the restart race.
 */
export class ChokidarFileWatcher {
  private static readonly DEBOUNCE_MS = 300;

  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: Array<{ type: WatcherEventType; absolutePath: string }> = [];
  private rootPath = '';

  constructor(
    rootPath: string,
    ignorePatterns: readonly IgnorePattern[],
    private readonly onBatch: (events: readonly WatcherEvent[]) => Promise<void>,
    private readonly logger: Logger
  ) {
    this.rootPath = PathUtils.normalize(rootPath);
    this.watcher = chokidar.watch(rootPath, {
      ignored: ignorePatterns.map((p) => toChokidarPattern(p.value)),
      ignoreInitial: false,
      persistent: true,
      depth: Infinity,
    });

    this.watcher.on('add', (filePath) => this.queueEvent('add', filePath));
    this.watcher.on('change', (filePath) => this.queueEvent('change', filePath));
    this.watcher.on('unlink', (filePath) => this.queueEvent('unlink', filePath));
    this.watcher.on('addDir', (dirPath) => this.queueEvent('addDir', dirPath));
    this.watcher.on('unlinkDir', (dirPath) => this.queueEvent('unlinkDir', dirPath));
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      try {
        await this.watcher.close();
      } catch (error) {
        this.logger.warn('watcher close failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pending = [];
  }

  private queueEvent(type: WatcherEventType, absolutePath: string): void {
    this.pending.push({ type, absolutePath });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      void this.flushEvents();
    }, ChokidarFileWatcher.DEBOUNCE_MS);
  }

  private async flushEvents(): Promise<void> {
    const batch = [...this.pending];
    this.pending = [];

    const events: WatcherEvent[] = batch.map(({ type, absolutePath }) => ({
      type,
      relativePath: this.toRelativePath(absolutePath),
    }));

    try {
      await this.onBatch(events);
    } catch (error) {
      this.logger.error('watcher batch processing failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private toRelativePath(absolutePath: string): string {
    const normalized = PathUtils.normalize(absolutePath);
    if (normalized === this.rootPath) {
      return '.';
    }
    if (normalized.startsWith(`${this.rootPath}/`)) {
      return normalized.slice(this.rootPath.length + 1);
    }
    return normalized;
  }
}

function toChokidarPattern(raw: string): string {
  // 1. Explicit directory (trailing slash)
  if (raw.endsWith('/')) {
    const dirName = raw.slice(0, -1);
    return `**/${dirName}/**`;
  }

  // 2. Contains a slash → already a relative path, use as-is
  if (raw.includes('/')) {
    return raw;
  }

  // 3. Wildcard pattern without slash → match at any depth
  // 4. Plain name (file or directory) → `**/name` matches both
  return `**/${raw}`;
}