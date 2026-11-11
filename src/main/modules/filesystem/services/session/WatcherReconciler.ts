import type { EventBus } from '../../../../shared/event-bus/event-bus';
import type { Logger } from '../../../../shared/logger/logger';
import type { NodeFsProbe } from '../../infrastructure/node-fs-probe';
import type { FileIndexStore } from '../../infrastructure/file-index-store';

export class WatcherReconciler {
  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly fsProbe: NodeFsProbe,
    private readonly getGeneration: () => number
  ) {}

  async reconcileAfterWatcherReady(
    store: FileIndexStore,
    rootPath: string,
    seenPaths: ReadonlySet<string>,
    myGeneration: number
  ): Promise<void> {
    if (myGeneration !== this.getGeneration()) return;
    if (seenPaths.size === 0) {
      this.logger.debug('watcher reconcile skipped: empty seenPaths', { rootPath });
      return;
    }
    const start = Date.now();
    const indexed = new Set<string>();
    for await (const { path } of store.listEntriesIterable()) {
      if (myGeneration !== this.getGeneration()) return;
      indexed.add(path);
    }
    const stale: string[] = [];
    for (const p of indexed) if (!seenPaths.has(p)) stale.push(p);
    const missing: string[] = [];
    for (const p of seenPaths) if (!indexed.has(p)) missing.push(p);

    if (stale.length === 0 && missing.length === 0) {
      this.logger.debug('watcher reconcile: no drift', {
        rootPath,
        indexed: indexed.size,
        seen: seenPaths.size,
      });
      return;
    }

    if (stale.length > 0) await store.deleteBatch(stale);
    if (myGeneration !== this.getGeneration()) return;

    const classified = await this.classifyMissingPaths(rootPath, missing);
    if (myGeneration !== this.getGeneration()) return;

    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const p of missing) {
      const isDir = classified.get(p);
      if (isDir === undefined) continue;
      toUpsert.push({ path: p, isDirectory: isDir });
    }
    await store.bulkUpsert(toUpsert);
    if (myGeneration !== this.getGeneration()) return;

    if (stale.length > 0 || toUpsert.length > 0) {
      store.setLastScan(new Date().toISOString());
      await store.flush();
      this.eventBus.emit('FileDiscovered', { path: '.', isDirectory: true });
    }

    this.logger.info('watcher reconcile finalized', {
      rootPath,
      staleRemoved: stale.length,
      added: toUpsert.length,
      totalMs: Date.now() - start,
    });
  }

  private async classifyMissingPaths(
    rootPath: string,
    missing: readonly string[]
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    if (missing.length === 0) return result;
    const byParent = new Map<string, string[]>();
    for (const p of missing) {
      const slashIdx = p.lastIndexOf('/');
      const parent = slashIdx === -1 ? '.' : p.slice(0, slashIdx);
      const bucket = byParent.get(parent);
      if (bucket) bucket.push(p);
      else byParent.set(parent, [p]);
    }
    for (const [parent, paths] of byParent) {
      try {
        const absParent = parent === '.' ? rootPath : this.fsProbe.absolutePath(rootPath, parent);
        const entries = await this.fsProbe.readDir(absParent);
        const byName = new Map<string, boolean>();
        for (const e of entries) byName.set(e.name, e.isDirectory);
        for (const p of paths) {
          const name = p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p;
          const isDir = byName.get(name);
          if (isDir !== undefined) result.set(p, isDir);
        }
      } catch {
        /* Parent unreadable — leave unclassified. */
      }
    }
    return result;
  }
}