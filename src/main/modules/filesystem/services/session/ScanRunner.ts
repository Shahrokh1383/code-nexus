import { promises as fs } from 'fs';
import type { EventBus } from '../../../../shared/event-bus/event-bus';
import type { Logger } from '../../../../shared/logger/logger';
import type { IgnorePattern } from '../../domain/ignore-pattern';
import { DEFAULT_IGNORED_SEGMENTS } from '../../infrastructure/chokidar-watcher';
import { fastScanWorkspace, type ScanResult } from '../../infrastructure/fast-scanner';
import type { FileIndexStore } from '../../infrastructure/file-index-store';

const EMIT_YIELD_INTERVAL = 500;

export class ScanRunner {
  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly getGeneration: () => number
  ) {}

  async performInitialScan(
    store: FileIndexStore,
    rootPath: string,
    compiled: readonly IgnorePattern[],
    myGeneration: number
  ): Promise<void> {
    const scanStart = Date.now();

    const toPurge: string[] = [];
    let purgeSinceYield = 0;
    for await (const { path } of store.listEntriesIterable()) {
      if (myGeneration !== this.getGeneration()) return;
      let matches = false;
      if (path.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s))) {
        matches = true;
      } else {
        for (const matcher of compiled) {
          try {
            if (matcher.matches(path)) { matches = true; break; }
          } catch {
            /* per-pattern skipped */
          }
        }
      }
      if (matches) toPurge.push(path);
      purgeSinceYield++;
      if (purgeSinceYield >= EMIT_YIELD_INTERVAL) {
        purgeSinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
    if (myGeneration !== this.getGeneration()) return;

    if (toPurge.length > 0) {
      await store.deleteBatch(toPurge);
      this.logger.info('purged ignored index entries', { removed: toPurge.length });
    }

    store.markScanStart();
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger).finally(() => {
      store.markScanEnd();
    });
    if (myGeneration !== this.getGeneration()) return;

    // Reachability guard: if the root is temporarily unreachable (unmounted
    // drive, offline network share, permissions revoked), fastScanWorkspace
    // returns an empty file set, and applyScanToStore would incorrectly mark
    // every indexed path as stale — wiping the index. Verify root is a
    // readable directory before applying the scan.
    try {
      const stat = await fs.stat(rootPath);
      if (!stat.isDirectory()) {
        throw new Error('root path is not a directory');
      }
    } catch (error) {
      this.logger.warn('scan aborted: workspace root unreachable', {
        rootPath,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    const result = await this.applyScanToStore(store, scan, myGeneration, () => {
      this.eventBus.emit('FileDeleted', { path: '.' });
    });
    if (!result) return;

    if (result.stale > 0 || result.added > 0) {
      store.setLastScan(new Date().toISOString());
      await store.flush();
      this.eventBus.emit('FileDiscovered', { path: '.', isDirectory: true });
    }

    this.logger.info('initial scan finalized', {
      scanned: scan.files.size,
      staleRemoved: result.stale,
      added: result.added,
      scanMs: scan.durationMs,
      totalMs: Date.now() - scanStart,
    });
  }

  private async applyScanToStore(
    store: FileIndexStore,
    scan: ScanResult,
    myGeneration: number,
    onStaleDeleted?: () => void
  ): Promise<{ stale: number; added: number } | null> {
    if (myGeneration !== this.getGeneration()) return null;
    const existingPaths = new Set<string>();
    for await (const { path } of store.listEntriesIterable()) {
      if (myGeneration !== this.getGeneration()) return null;
      existingPaths.add(path);
    }
    const stale: string[] = [];
    for (const p of existingPaths) if (!scan.files.has(p)) stale.push(p);
    if (stale.length > 0) {
      await store.deleteBatch(stale);
      if (onStaleDeleted) onStaleDeleted();
    }
    if (myGeneration !== this.getGeneration()) return null;
    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const [p, isDir] of scan.files) {
      if (!existingPaths.has(p)) toUpsert.push({ path: p, isDirectory: isDir });
    }
    if (toUpsert.length > 0) await store.bulkUpsert(toUpsert);
    return { stale: stale.length, added: toUpsert.length };
  }
}