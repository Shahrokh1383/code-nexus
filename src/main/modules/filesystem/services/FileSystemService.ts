// src/main/modules/filesystem/services/FileSystemService.ts
import type { FileTreeDto } from '@shared/ipc/filesystem';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { WorkspaceServiceContract } from '../../workspace/services/contracts/WorkspaceServiceContract';
import type { FileSystemServiceContract } from './contracts/FileSystemServiceContract';
import { IgnorePattern } from '../domain/ignore-pattern';
import { FileIndexStore } from '../infrastructure/file-index-store';
import {
  ChokidarFileWatcher,
  DEFAULT_IGNORED_SEGMENTS,
} from '../infrastructure/chokidar-watcher';
import { NodeFsProbe } from '../infrastructure/node-fs-probe';
import { FileIndexMaintainer } from './file-index-maintainer';
import { buildFileTree, buildFileTreeFromIndex  } from './tree-builder';

function sessionMismatch(): DomainException {
  return new DomainException(
    'WORKSPACE_NOT_ACTIVE',
    'Workspace context is not initialized or path mismatch.'
  );
}

/**
 * File-system module service. Owns the file index, the watcher session, and
 * the ignore-pattern reactions. Config persistence goes through the workspace
 * module contract — the only legal synchronous cross-module channel.
 */
export class FileSystemService implements FileSystemServiceContract {
  private activeRootPath: string | null = null;
  private indexStore: FileIndexStore | null = null;
  private watcher: ChokidarFileWatcher | null = null;
  private readonly fsProbe = new NodeFsProbe();

  constructor(
    private readonly file: AtomicJsonFile,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly workspace: () => WorkspaceServiceContract
  ) {}

  private async purgeDefaultIgnoredEntries(store: FileIndexStore): Promise<void> {
    const entries = await store.listEntries();
    if (entries.length === 0) {
      return;
    }
    const toDelete: string[] = [];
    for (const { path } of entries) {
      const segments = path.split('/');
      if (segments.some((segment) => DEFAULT_IGNORED_SEGMENTS.has(segment))) {
        toDelete.push(path);
      }
    }
    if (toDelete.length === 0) {
      return;
    }
    await store.deleteBatch(toDelete);
    this.logger.info('purged default-ignored index entries', { removed: toDelete.length });
  }

  getActiveRootPath(): string | null {
    return this.activeRootPath;
  }

  async activateSession(rootPath: string, ignorePatterns: readonly string[]): Promise<void> {
    await this.deactivateSession();

    const store = new FileIndexStore(rootPath, this.file, this.logger);
    await this.purgeDefaultIgnoredEntries(store);
    await this.reconcileIndex(rootPath, store);

    // Purge ignore-pattern matches; invalid patterns are skipped silently.
    for (const raw of ignorePatterns) {
      try {
        await store.deleteByPattern(new IgnorePattern(raw));
      } catch {
        // ignore invalid patterns
      }
    }
    await store.flush();

    const compiled = ignorePatterns
      .map((p) => {
        try {
          return new IgnorePattern(p);
        } catch {
          return null;
        }
      })
      .filter((p): p is IgnorePattern => p !== null);

    const maintainer = new FileIndexMaintainer(
      store,
      this.eventBus,
      this.logger,
      compiled
    );
    const watcher = new ChokidarFileWatcher(
      rootPath,
      compiled,
      (events) => maintainer.applyBatch(events),
      this.logger
    );

    this.indexStore = store;
    this.watcher = watcher;
    this.activeRootPath = rootPath;
    this.logger.info('file session activated', { rootPath });
  }

  async deactivateSession(): Promise<void> {
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

  async getFileTree(workspaceId: string, parentPath?: string): Promise<FileTreeDto>  {
    const store = this.assertActiveSession(workspaceId);
    const rootPath = this.activeRootPath!;
    const patterns = await this.workspace().getIgnorePatterns(workspaceId);
    const parent = parentPath ?? '.';
    const parentEntry = parent === '.' ? { isDirectory: true as const } : await store.findByPath(parent);
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
    // Flush immediately so the watcher restart does not see stale data.
    await store.flush();

    for (const path of deletedPaths) {
      this.eventBus.emit('FileExcluded', { path });
    }
    this.eventBus.emit('IgnorePatternsChanged', { workspaceId });
  }

  async removeIgnorePattern(workspaceId: string, pattern: string): Promise<void> {
    this.assertActiveSession(workspaceId);
    await this.workspace().removeIgnorePattern(workspaceId, pattern);
    this.eventBus.emit('IgnorePatternsChanged', { workspaceId });
  }

  private assertActiveSession(workspaceId: string): FileIndexStore {
    if (this.activeRootPath === null || this.activeRootPath !== workspaceId || !this.indexStore) {
      throw sessionMismatch();
    }
    return this.indexStore;
  }

  private async reconcileIndex(rootPath: string, store: FileIndexStore): Promise<void> {
    const entries = await store.listEntries();
    if (entries.length === 0) {
      return;
    }

    const CONCURRENCY = 64;
    const toDelete: string[] = [];

    for (let i = 0; i < entries.length; i += CONCURRENCY) {
      const chunk = entries.slice(i, i + CONCURRENCY);
      const checks = await Promise.all(
        chunk.map(async ({ path }) => ({
          path,
          exists: await this.fsProbe.existsAsync(
            this.fsProbe.absolutePath(rootPath, path)
          ),
        }))
      );
      for (const { path, exists } of checks) {
        if (!exists) {
          toDelete.push(path);
        }
      }
      if (i + CONCURRENCY < entries.length) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    if (toDelete.length > 0) {
      await store.deleteBatch(toDelete);
      this.logger.info('reconciled stale index entries', { removed: toDelete.length });
      await store.flush();
    }
  }
}