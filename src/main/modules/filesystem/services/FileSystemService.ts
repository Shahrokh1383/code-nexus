import type { FileTreeDto } from '@shared/ipc/filesystem';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { WorkspaceServiceContract } from '../../workspace/services/contracts/WorkspaceServiceContract';
import type { FileSystemServiceContract } from './contracts/FileSystemServiceContract';
import { IgnorePattern } from '../domain/ignore-pattern';
import { pathNameOf } from '../domain/file-path';
import { FileIndexStore } from '../infrastructure/file-index-store';
import { ChokidarFileWatcher, DEFAULT_IGNORED_SEGMENTS } from '../infrastructure/chokidar-watcher';
import { NodeFsProbe } from '../infrastructure/node-fs-probe';
import { fastScanWorkspace } from '../infrastructure/fast-scanner';
import { FileIndexMaintainer } from './file-index-maintainer';
import { buildFileTree, buildFileTreeFromIndex, MAX_CHILDREN } from './tree-builder';

const STORE_CACHE_CAP = 3;

function sessionMismatch(): DomainException {
  return new DomainException('WORKSPACE_NOT_ACTIVE', 'Workspace context is not initialized or path mismatch.');
}

function compilePatterns(raw: readonly string[]): IgnorePattern[] {
  const compiled: IgnorePattern[] = [];
  for (const p of raw) {
    try { compiled.push(new IgnorePattern(p)); } catch { /* invalid skipped */ }
  }
  return compiled;
}

export class FileSystemService implements FileSystemServiceContract {
  private static readonly EMIT_YIELD_INTERVAL = 500;

  private activeRootPath: string | null = null;
  private indexStore: FileIndexStore | null = null;
  private watcher: ChokidarFileWatcher | null = null;
  private readonly fsProbe = new NodeFsProbe();
  private generation = 0;
  private readonly storesByRoot = new Map<string, FileIndexStore>();

  constructor(
    private readonly file: AtomicJsonFile,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly workspace: () => WorkspaceServiceContract
  ) {}

  getActiveRootPath(): string | null {
    return this.activeRootPath;
  }

  private getStore(rootPath: string): FileIndexStore {
    const existing = this.storesByRoot.get(rootPath);
    if (existing) {
      this.storesByRoot.delete(rootPath);
      this.storesByRoot.set(rootPath, existing);
      return existing;
    }
    const created = new FileIndexStore(rootPath, this.file, this.logger);
    this.storesByRoot.set(rootPath, created);
    if (this.storesByRoot.size > STORE_CACHE_CAP) {
      const oldestKey = this.storesByRoot.keys().next().value;
      if (oldestKey !== undefined && oldestKey !== rootPath) {
        this.storesByRoot.delete(oldestKey);
      }
    }
    return created;
  }

  async activateSession(rootPath: string, ignorePatterns: readonly string[]): Promise<void> {
    if (this.activeRootPath === rootPath && this.indexStore && this.watcher) {
      return;
    }

    await this.deactivateSession();

    const activationStart = Date.now();
    const store = this.getStore(rootPath);
    await store.ensureExists();

    const compiled = compilePatterns(ignorePatterns);
    this.indexStore = store;
    this.activeRootPath = rootPath;

    const myGeneration = this.generation;
    const cleanExit = await store.getCleanExit();
    if (myGeneration !== this.generation) return;

    if (cleanExit) {
      // Defer watcher installation to allow UI to paint first.
      setTimeout(() => {
        if (myGeneration === this.generation) {
          try {
            this.installWatcher(store, rootPath, compiled, myGeneration);
          } catch (error) {
            this.logger.error('failed to install watcher during activation', {
              rootPath,
              message: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }, 500);
    } else {
      void this.performInitialScan(store, rootPath, compiled, myGeneration)
        .then(() => {
          if (myGeneration !== this.generation) return;
          try {
            this.installWatcher(store, rootPath, compiled, myGeneration);
          } catch (error) {
            this.logger.error('failed to install watcher after scan', {
              rootPath,
              message: error instanceof Error ? error.message : String(error),
            });
          }
        })
        .catch((error) => {
          this.logger.error('background initial scan failed', {
            rootPath,
            message: error instanceof Error ? error.message : String(error),
          });
        });
    }

    this.logger.info('file session activated', {
      rootPath,
      activationMs: Date.now() - activationStart,
      cleanExit,
    });
  }

  async deactivateSession(): Promise<void> {
    this.generation += 1;
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }
    if (this.indexStore) {
      await this.indexStore.markCleanExit();
      this.indexStore = null;
    }
    if (this.activeRootPath !== null) {
      this.logger.info('file session deactivated', { rootPath: this.activeRootPath });
    }
    this.activeRootPath = null;
  }

  async getFileTree(workspaceId: string, parentPath?: string): Promise<FileTreeDto> {
    const store = this.assertActiveSession(workspaceId);
    const rootPath = this.activeRootPath!;
    const patterns = await this.workspace().getIgnorePatterns(workspaceId);
    const parent = parentPath ?? '.';

    const compiled = compilePatterns(patterns);
    const isIgnored =
      parent !== '.' &&
      (parent.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s)) ||
        compiled.some((matcher) => {
          try { return matcher.matches(parent); } catch { return false; }
        }));

    if (isIgnored) {
      return {
        root: { id: parent, path: parent, name: pathNameOf(parent), children: [] },
        totalFiles: 0,
        totalFolders: 0,
      };
    }

    const parentEntry =
      parent === '.' ? { isDirectory: true as const } : await store.findByPath(parent);

    if (parentEntry?.isDirectory) {
      const indexed = await store.findChildrenOf(parent, MAX_CHILDREN);
      return buildFileTreeFromIndex(parent, indexed, patterns);
    }

    return buildFileTree(rootPath, this.fsProbe, parentPath, patterns);
  }

  async getIgnoredFiles(workspaceId: string): Promise<string[]> {
    this.assertActiveSession(workspaceId);
    return this.workspace().getIgnorePatterns(workspaceId);
  }

  async addIgnorePattern(workspaceId: string, pattern: string): Promise<void> {
    const store = this.assertActiveSession(workspaceId);
    const validated = new IgnorePattern(pattern);

    await this.workspace().addIgnorePattern(workspaceId, pattern);
    const deletedPaths = await store.deleteByPattern(validated);
    await store.flush();

    for (const path of deletedPaths) {
      this.eventBus.emit('FileExcluded', { path });
    }
    await this.restartWatcher();
    this.eventBus.emit('IgnorePatternsChanged', { workspaceId });
  }

  async removeIgnorePattern(workspaceId: string, pattern: string): Promise<void> {
    this.assertActiveSession(workspaceId);
    await this.workspace().removeIgnorePattern(workspaceId, pattern);
    await this.restartWatcher();
    this.eventBus.emit('IgnorePatternsChanged', { workspaceId });
  }

  private installWatcher(
    store: FileIndexStore,
    rootPath: string,
    compiled: readonly IgnorePattern[],
    myGeneration: number
  ): void {
    if (myGeneration !== this.generation) return;
    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);
    this.watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger,
      {
        ignoreInitial: true,
        onReady: (seenPaths) =>
          this.reconcileAfterWatcherReady(store, rootPath, seenPaths, myGeneration),
      }
    );
  }

  private async performInitialScan(
    store: FileIndexStore,
    rootPath: string,
    compiled: readonly IgnorePattern[],
    myGeneration: number
  ): Promise<void> {
    const scanStart = Date.now();

    const toPurge: string[] = [];
    let purgeSinceYield = 0;
    for await (const { path } of store.listEntriesIterable()) {
      if (myGeneration !== this.generation) return;
      let matches = false;
      if (path.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s))) {
        matches = true;
      } else {
        for (const matcher of compiled) {
          try {
            if (matcher.matches(path)) { matches = true; break; }
          } catch { /* per-pattern skipped */ }
        }
      }
      if (matches) toPurge.push(path);
      purgeSinceYield++;
      if (purgeSinceYield >= FileSystemService.EMIT_YIELD_INTERVAL) {
        purgeSinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
    if (myGeneration !== this.generation) return;

    if (toPurge.length > 0) {
      await store.deleteBatch(toPurge);
      this.logger.info('purged ignored index entries', { removed: toPurge.length });
    }

    store.markScanStart();
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger).finally(() => {
      store.markScanEnd();
    });
    if (myGeneration !== this.generation) return;

    const existingPaths = new Set<string>();
    for await (const { path } of store.listEntriesIterable()) {
      if (myGeneration !== this.generation) return;
      existingPaths.add(path);
    }

    const stale: string[] = [];
    for (const p of existingPaths) {
      if (!scan.files.has(p)) stale.push(p);
    }
    if (stale.length > 0) {
      await store.deleteBatch(stale);
      // OPTIMIZATION: Batched into a single event. Emitting 100k events
      // causes RendererBridge to spam setTimeout/clearTimeout 100k times.
      this.eventBus.emit('FileDeleted', { path: '.' });
    }

    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const [p, isDir] of scan.files) {
      if (!existingPaths.has(p)) toUpsert.push({ path: p, isDirectory: isDir });
    }

    await store.bulkUpsert(toUpsert);

    if (stale.length > 0 || toUpsert.length > 0) {
      store.setLastScan(new Date().toISOString());
      await store.flush();
      this.eventBus.emit('FileDiscovered', { path: '.', isDirectory: true });
    }

    this.logger.info('initial scan finalized', {
      scanned: scan.files.size,
      staleRemoved: stale.length,
      added: toUpsert.length,
      scanMs: scan.durationMs,
      totalMs: Date.now() - scanStart,
    });
  }

  private async reconcileAfterWatcherReady(
    store: FileIndexStore,
    rootPath: string,
    seenPaths: ReadonlySet<string>,
    myGeneration: number
  ): Promise<void> {
    if (myGeneration !== this.generation) return;

    // If seenPaths is empty, chokidar initialized with ignoreInitial:true.
    // We cannot trust this as a full snapshot, so we skip reconciliation.
    if (seenPaths.size === 0) {
      this.logger.debug('watcher reconcile skipped: empty seenPaths', { rootPath });
      return;
    }

    const start = Date.now();
    const indexed = new Set<string>();
    for await (const { path } of store.listEntriesIterable()) {
      if (myGeneration !== this.generation) return;
      indexed.add(path);
    }

    const stale: string[] = [];
    for (const p of indexed) {
      if (!seenPaths.has(p)) stale.push(p);
    }
    const missing: string[] = [];
    for (const p of seenPaths) {
      if (!indexed.has(p)) missing.push(p);
    }

    if (stale.length === 0 && missing.length === 0) {
      this.logger.debug('watcher reconcile: no drift', {
        rootPath,
        indexed: indexed.size,
        seen: seenPaths.size,
      });
      return;
    }

    if (stale.length > 0) await store.deleteBatch(stale);
    if (myGeneration !== this.generation) return;

    const classified = await this.classifyMissingPaths(rootPath, missing);
    if (myGeneration !== this.generation) return;

    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const p of missing) {
      const isDir = classified.get(p);
      if (isDir === undefined) continue;
      toUpsert.push({ path: p, isDirectory: isDir });
    }

    await store.bulkUpsert(toUpsert);
    if (myGeneration !== this.generation) return;

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
        // Parent unreadable — leave unclassified.
      }
    }
    return result;
  }

  private async restartWatcher(): Promise<void> {
    const store = this.indexStore;
    const rootPath = this.activeRootPath;
    if (!store || !rootPath) return;

    const patterns = await this.workspace().getIgnorePatterns(rootPath);
    const compiled = compilePatterns(patterns);

    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }

    store.markScanStart();
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger).finally(() => {
      store.markScanEnd();
    });

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

    const myGeneration = this.generation;
    this.installWatcher(store, rootPath, compiled, myGeneration);
    this.logger.info('watcher restarted', {
      rootPath,
      patterns: compiled.length,
      scanned: scan.files.size,
      scanMs: scan.durationMs,
    });
  }

  private assertActiveSession(workspaceId: string): FileIndexStore {
    if (this.activeRootPath === null || this.activeRootPath !== workspaceId || !this.indexStore) {
      throw sessionMismatch();
    }
    return this.indexStore;
  }
}