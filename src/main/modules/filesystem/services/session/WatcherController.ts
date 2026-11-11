import type { EventBus } from '../../../../shared/event-bus/event-bus';
import type { Logger } from '../../../../shared/logger/logger';
import type { WorkspaceServiceContract } from '../../../workspace/services/contracts/WorkspaceServiceContract';
import { IgnorePattern } from '../../domain/ignore-pattern';
import { ChokidarFileWatcher } from '../../infrastructure/chokidar-watcher';
import { fastScanWorkspace } from '../../infrastructure/fast-scanner';
import type { FileIndexStore } from '../../infrastructure/file-index-store';
import { FileIndexMaintainer } from '../file-index-maintainer';
import type { WatcherReconciler } from './WatcherReconciler';

function compilePatterns(raw: readonly string[]): IgnorePattern[] {
  const compiled: IgnorePattern[] = [];
  for (const p of raw) {
    try { compiled.push(new IgnorePattern(p)); } catch { /* invalid skipped */ }
  }
  return compiled;
}

export class WatcherController {
  private current: ChokidarFileWatcher | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly workspace: () => WorkspaceServiceContract,
    private readonly reconciler: WatcherReconciler,
    private readonly getGeneration: () => number
  ) {}

  isActive(): boolean {
    return this.current !== null;
  }

  async stop(): Promise<void> {
    if (this.current) {
      await this.current.stop();
      this.current = null;
    }
  }

  install(
    store: FileIndexStore,
    rootPath: string,
    compiled: readonly IgnorePattern[],
    myGeneration: number
  ): void {
    if (myGeneration !== this.getGeneration()) return;
    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);
    this.current = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger,
      {
        ignoreInitial: true,
        onReady: (seenPaths) =>
          this.reconciler.reconcileAfterWatcherReady(store, rootPath, seenPaths, myGeneration),
      }
    );
  }

  async restart(store: FileIndexStore, rootPath: string): Promise<void> {
    const patterns = await this.workspace().getIgnorePatterns(rootPath);
    const compiled = compilePatterns(patterns);
    await this.stop();

    store.markScanStart();
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger).finally(() => {
      store.markScanEnd();
    });

    // Preserve original semantics: no generation guard around the diff/apply
    // block; generation is captured immediately before install (matching the
    // legacy restartWatcher behavior).
    const existingPaths = new Set<string>();
    for await (const { path } of store.listEntriesIterable()) existingPaths.add(path);
    const stale: string[] = [];
    for (const p of existingPaths) if (!scan.files.has(p)) stale.push(p);
    if (stale.length > 0) await store.deleteBatch(stale);
    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const [p, isDir] of scan.files) {
      if (!existingPaths.has(p)) toUpsert.push({ path: p, isDirectory: isDir });
    }
    if (toUpsert.length > 0) await store.bulkUpsert(toUpsert);
    await store.flush();

    const myGeneration = this.getGeneration();
    this.install(store, rootPath, compiled, myGeneration);
    this.logger.info('watcher restarted', {
      rootPath,
      patterns: compiled.length,
      scanned: scan.files.size,
      scanMs: scan.durationMs,
    });
  }
}