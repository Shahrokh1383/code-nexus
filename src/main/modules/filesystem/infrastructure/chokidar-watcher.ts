import chokidar, { type FSWatcher } from 'chokidar';
import type { Logger } from '../../../shared/logger/logger';
import { PathUtils } from '../../../shared/utils/path-utils';
import type { IgnorePattern } from '../domain/ignore-pattern';

export type WatcherEventType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

export interface WatcherEvent {
  type: WatcherEventType;
  relativePath: string;
}

export interface ChokidarFileWatcherOptions {
  onReady?: (seenPaths: ReadonlySet<string>) => Promise<void>;
  ignoreInitial?: boolean;
}

export const DEFAULT_IGNORED_SEGMENTS: ReadonlySet<string> = new Set([
  'node_modules', '.git', '.svn', '.hg', '.cache', 'dist', 'build',
  'out', '.next', '.nuxt', 'target', 'coverage',
]);

export class ChokidarFileWatcher {
  private static readonly DEBOUNCE_MS = 300;
  private static readonly MAX_BATCH_SIZE = 500;

  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: Array<{ type: WatcherEventType; absolutePath: string }> = [];
  private rootPath = '';
  private seenPaths = new Set<string>();
  private initialScanDone = false;

  constructor(
    rootPath: string,
    ignorePatterns: readonly IgnorePattern[],
    private readonly onBatch: (events: readonly WatcherEvent[]) => Promise<void>,
    private readonly logger: Logger,
    options: ChokidarFileWatcherOptions = {}
  ) {
    this.rootPath = PathUtils.normalize(rootPath);
    
    // Fast predicate function instead of glob array
    const isIgnored = (path: string) => {
      const normalized = PathUtils.normalize(path);
      const relative = normalized === this.rootPath ? '' : normalized.slice(this.rootPath.length + 1);
      if (!relative) return false;
      const segments = relative.split('/');
      if (segments.some(s => DEFAULT_IGNORED_SEGMENTS.has(s))) return true;
      return ignorePatterns.some(p => {
        try { return p.matches(relative); } catch { return false; }
      });
    };

    this.watcher = chokidar.watch(rootPath, {
      ignored: (path: string) => isIgnored(path),
      ignoreInitial: options.ignoreInitial ?? false,
      persistent: true,
      depth: Infinity,
    });

    let observed = 0;
    const track = (fn: (p: string) => void) => (p: string) => {
      observed += 1;
      fn(p);
    };

    this.watcher.on('add', track((p) => this.queueEvent('add', p)));
    this.watcher.on('change', track((p) => this.queueEvent('change', p)));
    this.watcher.on('unlink', track((p) => this.queueEvent('unlink', p)));
    this.watcher.on('addDir', track((p) => this.queueEvent('addDir', p)));
    this.watcher.on('unlinkDir', track((p) => this.queueEvent('unlinkDir', p)));

    this.watcher.on('error', (error) => {
      this.logger.error('watcher error', {
        message: error instanceof Error ? error.message : String(error),
      });
    });

    this.watcher.once('ready', () => {
      this.initialScanDone = true;
      const seen = this.seenPaths;
      this.seenPaths = new Set();
      this.logger.info('watcher initial scan ready', {
        rootPath: this.rootPath,
        observed,
        seen: seen.size,
      });
      const onReady = options.onReady;
      if (onReady) {
        void onReady(seen).catch((error: unknown) => {
          this.logger.error('initial-scan reconcile failed', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
    });
  }

  async stop(): Promise<void> {
    this.initialScanDone = true;
    this.seenPaths = new Set();
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
    if (!this.initialScanDone) {
      this.seenPaths.add(this.toRelativePath(absolutePath));
    }
    this.pending.push({ type, absolutePath });

    if (this.pending.length >= ChokidarFileWatcher.MAX_BATCH_SIZE) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      void this.flushEvents();
      return;
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushEvents();
    }, ChokidarFileWatcher.DEBOUNCE_MS);
  }

  private async flushEvents(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];

    const events: WatcherEvent[] = batch.map(({ type, absolutePath }) => ({
      type,
      relativePath: this.toRelativePath(absolutePath),
    }));

    try {
      await this.onBatch(events);
    } catch (error) {
      this.logger.error('watcher batch processing failed', {
        count: events.length,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private toRelativePath(absolutePath: string): string {
    const normalized = PathUtils.normalize(absolutePath);
    if (normalized === this.rootPath) return '.';
    if (normalized.startsWith(`${this.rootPath}/`)) {
      return normalized.slice(this.rootPath.length + 1);
    }
    return normalized;
  }
}