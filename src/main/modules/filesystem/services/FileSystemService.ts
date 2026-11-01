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
    try {
      compiled.push(new IgnorePattern(p));
    } catch {
      // Invalid pattern: skipped silently, matching legacy try/catch behavior.
    }
  }
  return compiled;
}

/**
 * File-system module service. Owns the file index, the watcher session, and
 * the ignore-pattern reactions. Config persistence goes through the workspace
 * module contract — the only legal synchronous cross-module channel.
 *
 * Session lifecycle invariants:
 *  1. `ensureExists()` runs before the purge so `file-index.json` is on disk
 *     even for a never-opened workspace (legacy parity: file was always
 *     present after `initialize`).
 *  2. Purge runs in one pass with patterns compiled once — O(N·(M+P)), not
 *     the previous O(N·M) + O(P·N).
 *  3. Stale-entry reconcile is post-ready and in-memory only — no `fs.access`
 *     on the activation path (cold-start freeze fix).
 *  4. `lastScan` is set on scan ready and flushed — restores legacy field
 *     that was silently null forever in the new codebase.
 *  5. `addIgnorePattern` / `removeIgnorePattern` restart the watcher with the
 *     new pattern set — previously changes only reached disk and never the
 *     running watcher until the next full reactivation.
 */
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
    // Idempotency guard (D1): repeated `getWorkspace` for the active root is
    // a no-op. Pattern changes go through addIgnorePattern/removeIgnorePattern
    // which restart the watcher explicitly (D10) — so this guard never
    // freezes stale pattern state in place.
    if (this.activeRootPath === rootPath && this.indexStore && this.watcher) {
      return;
    }

    await this.deactivateSession();

    const gen = ++this.generation;
    const store = new FileIndexStore(rootPath, this.file, this.logger);

    // Guarantee the metadata file exists on disk before watcher work begins
    // — restores legacy behavior where `file-index.json` was always present
    // after workspace open.
    await store.ensureExists();

    const compiled = compilePatterns(ignorePatterns);

    // Single-pass purge: default-ignored segments ∪ user patterns. Replaces
    // two earlier passes (purgeDefaultIgnoredEntries + per-pattern scan).
    const entries = await store.listEntries();
    const toPurge: string[] = [];
    for (const { path } of entries) {
      if (path.split('/').some((s) => DEFAULT_IGNORED_SEGMENTS.has(s))) {
        toPurge.push(path);
        continue;
      }
      for (const matcher of compiled) {
        try {
          if (matcher.matches(path)) {
            toPurge.push(path);
            break;
          }
        } catch {
          // Per-pattern failure skipped.
        }
      }
    }
    if (toPurge.length > 0) {
      await store.deleteBatch(toPurge);
      this.logger.info('purged ignored index entries', { removed: toPurge.length });
    }
    await store.flush();

    const snapshot = new Set<string>((await store.listEntries()).map((e) => e.path));

    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);
    const watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger,
      { onReady: (seen) => this.onInitialScanReady(store, snapshot, seen, gen) }
    );

    this.indexStore = store;
    this.watcher = watcher;
    this.activeRootPath = rootPath;
    this.logger.info('file session activated', {
      rootPath,
      initialEntries: snapshot.size,
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
    // Flush before restart so pending events don't reintroduce purged entries.
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
    // Restart so chokidar re-scans with the reduced set and re-emits 'add'
    // for previously-ignored paths — the maintainer re-indexes them.
    await this.restartWatcher();
    this.eventBus.emit('IgnorePatternsChanged', { workspaceId });
  }

  private async restartWatcher(): Promise<void> {
    const store = this.indexStore;
    const rootPath = this.activeRootPath;
    if (!store || !rootPath) {
      return;
    }

    const patterns = await this.workspace().getIgnorePatterns(rootPath);
    const compiled = compilePatterns(patterns);

    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = null;
    }

    const gen = ++this.generation;
    const snapshot = new Set<string>((await store.listEntries()).map((e) => e.path));
    const maintainer = new FileIndexMaintainer(store, this.eventBus, this.logger, compiled);

    this.watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger,
      { onReady: (seen) => this.onInitialScanReady(store, snapshot, seen, gen) }
    );
    this.logger.info('watcher restarted', {
      rootPath,
      patterns: compiled.length,
      snapshotSize: snapshot.size,
    });
  }

  private assertActiveSession(workspaceId: string): FileIndexStore {
    if (this.activeRootPath === null || this.activeRootPath !== workspaceId || !this.indexStore) {
      throw sessionMismatch();
    }
    return this.indexStore;
  }

  /**
   * Fires once per watcher lifecycle, after chokidar's initial scan. Two-phase:
   *   1. Delete index entries absent from the observed set — pure in-memory
   *      diff, zero fs syscalls (replaces the old N × fs.access reconcile).
   *   2. Stamp `lastScan` and flush — restores the legacy field that the new
   *      codebase left null forever.
   */
  private async onInitialScanReady(
    store: FileIndexStore,
    snapshot: ReadonlySet<string>,
    seen: ReadonlySet<string>,
    gen: number
  ): Promise<void> {
    if (this.generation !== gen || this.indexStore !== store) {
      return;
    }

    const stale: string[] = [];
    for (const path of snapshot) {
      if (!seen.has(path)) {
        stale.push(path);
      }
    }
    if (stale.length > 0) {
      await store.deleteBatch(stale);
      for (const path of stale) {
        this.eventBus.emit('FileDeleted', { path });
      }
      this.logger.info('reconciled stale index entries', { removed: stale.length });
    }

    if (this.generation !== gen || this.indexStore !== store) {
      return;
    }

    store.setLastScan(new Date().toISOString());
    await store.flush();
    this.logger.info('initial scan finalized', {
      seen: seen.size,
      staleRemoved: stale.length,
    });
  }
}