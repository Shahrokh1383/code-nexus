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
import { buildFileTree, buildFileTreeFromIndex } from './tree-builder';

function sessionMismatch(): DomainException {
  return new DomainException(
    'WORKSPACE_NOT_ACTIVE',
    'Workspace context is not initialized or path mismatch.'
  );
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

  constructor(
    private readonly file: AtomicJsonFile,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly workspace: () => WorkspaceServiceContract
  ) {}

  getActiveRootPath(): string | null {
    return this.activeRootPath;
  }

  async activateSession(rootPath: string, ignorePatterns: readonly string[]): Promise<void> {
    if (this.activeRootPath === rootPath && this.indexStore && this.watcher) {
      return;
    }

    await this.deactivateSession();

    const activationStart = Date.now();
    const store = new FileIndexStore(rootPath, this.file, this.logger);
    await store.ensureExists();

    const compiled = compilePatterns(ignorePatterns);

    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);
    
    // ALWAYS set ignoreInitial to true. 
    // We rely on fastScanWorkspace for the initial build and reconciliation.
    // Chokidar's native initial walk is too slow and floods the IPC.
    const watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger,
      { ignoreInitial: true }
    );

    this.indexStore = store;
    this.watcher = watcher;
    this.activeRootPath = rootPath;

    // Always run the scan in the background. If the index is up-to-date,
    // it will quickly find 0 changes and exit, keeping workspace switching instant.
    // We use `void` to explicitly mark this as fire-and-forget.
    const myGeneration = this.generation;
    void this.performInitialScan(store, rootPath, compiled, myGeneration).catch(
      (error) => {
        this.logger.error('background initial scan failed', {
          rootPath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    );

    this.logger.info('file session activated', {
      rootPath,
      activationMs: Date.now() - activationStart,
    });
  }

  async deactivateSession(): Promise<void> {
    this.generation += 1;
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }
    if (this.indexStore) {
      await this.indexStore.flush();
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
      const indexed = await store.findChildrenOf(parent);
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
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger);
    store.markScanEnd();
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
      let sinceYield = 0;
      for (let i = 0; i < stale.length; i++) {
        if (myGeneration !== this.generation) return;
        this.eventBus.emit('FileDeleted', { path: stale[i] });
        sinceYield++;
        if (sinceYield >= FileSystemService.EMIT_YIELD_INTERVAL) {
          sinceYield = 0;
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      }
    }

    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const [p, isDir] of scan.files) {
      if (!existingPaths.has(p)) toUpsert.push({ path: p, isDirectory: isDir });
    }

    await store.bulkUpsert(toUpsert);

    // Only flush and emit if the disk state actually differs from the index.
    // This prevents unnecessary disk writes and UI updates on every workspace switch.
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
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger);
    store.markScanEnd();

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

    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);
    this.watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger,
      { ignoreInitial: true }
    );
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