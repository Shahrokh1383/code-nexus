import type { FileTreeDto } from '@shared/ipc/filesystem';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { WorkspaceServiceContract } from '../../workspace/services/contracts/WorkspaceServiceContract';
import type { FileSystemServiceContract } from './contracts/FileSystemServiceContract';
import { IgnorePattern } from '../domain/ignore-pattern';
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

    // Purge ignored entries from existing index (single pass, patterns compiled once).
    const existing = await store.listEntries();
    const toPurge: string[] = [];
    for (const { path } of existing) {
      if (path.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s))) {
        toPurge.push(path);
        continue;
      }
      for (const matcher of compiled) {
        try {
          if (matcher.matches(path)) { toPurge.push(path); break; }
        } catch { /* per-pattern skipped */ }
      }
    }
    if (toPurge.length > 0) {
      await store.deleteBatch(toPurge);
      this.logger.info('purged ignored index entries', { removed: toPurge.length });
    }

    // Fast scan: one readdir per directory, 32-way concurrency, no per-file stat.
    // Populates the store in ~1–2 s for 100k files — independent of chokidar.
    store.markScanStart();
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger);
    store.markScanEnd();

    // Reconcile: remove stale (index has, disk doesn't) then bulk-add new.
    const existingPaths = new Set<string>();
    for (const { path } of await store.listEntries()) existingPaths.add(path);

    const stale: string[] = [];
    for (const p of existingPaths) {
      if (!scan.files.has(p)) stale.push(p);
    }
    if (stale.length > 0) {
      await store.deleteBatch(stale);
      for (const path of stale) this.eventBus.emit('FileDeleted', { path });
    }

    const toUpsert: Array<{ path: string; isDirectory: boolean }> = [];
    for (const [p, isDir] of scan.files) {
      if (!existingPaths.has(p)) toUpsert.push({ path: p, isDirectory: isDir });
    }
    if (toUpsert.length > 0) {
      await store.bulkUpsert(toUpsert);
    }

    store.setLastScan(new Date().toISOString());
    await store.flush();

    this.logger.info('initial scan finalized', {
      scanned: scan.files.size,
      staleRemoved: stale.length,
      added: toUpsert.length,
      scanMs: scan.durationMs,
      totalMs: Date.now() - activationStart,
    });

    // Watcher starts AFTER scan+reconcile+flush so index is on disk before any
    // event is processed. Chokidar's own setup scan runs in background; its
    // 'add' events for paths already in the index are no-ops in the maintainer.
    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);
    const watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger
    );

    this.indexStore = store;
    this.watcher = watcher;
    this.activeRootPath = rootPath;
    this.logger.info('file session activated', {
      rootPath,
      initialEntries: scan.files.size,
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

    // Re-scan because pattern set changed — this is the only case where a
    // re-scan is justified (removing an ignore pattern can surface files
    // that were never indexed). Bounded by the same ~1–2 s cost.
    store.markScanStart();
    const scan = await fastScanWorkspace(rootPath, compiled, this.logger);
    store.markScanEnd();

    const existingPaths = new Set<string>();
    for (const { path } of await store.listEntries()) existingPaths.add(path);
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
      this.logger
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