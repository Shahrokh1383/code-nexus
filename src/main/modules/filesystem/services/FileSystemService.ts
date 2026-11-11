import type { FileTreeDto } from '@shared/ipc/filesystem';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { WorkspaceServiceContract } from '../../workspace/services/contracts/WorkspaceServiceContract';
import type { FileSystemServiceContract } from './contracts/FileSystemServiceContract';
import { IgnorePattern } from '../domain/ignore-pattern';
import { FileIndexStore } from '../infrastructure/file-index-store';
import { NodeFsProbe } from '../infrastructure/node-fs-probe';
import { ScanRunner } from './session/ScanRunner';
import { WatcherReconciler } from './session/WatcherReconciler';
import { WatcherController } from './session/WatcherController';
import { FileTreeQuery } from './session/FileTreeQuery';

const STORE_CACHE_CAP = 3;

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
  private generation = 0;
  private readonly storesByRoot = new Map<string, FileIndexStore>();
  private readonly fsProbe = new NodeFsProbe();
  private readonly scanRunner: ScanRunner;
  private readonly watcherController: WatcherController;
  private readonly fileTreeQuery: FileTreeQuery;

  constructor(
    private readonly file: AtomicJsonFile,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly workspace: () => WorkspaceServiceContract
  ) {
    const getGeneration = (): number => this.generation;
    this.scanRunner = new ScanRunner(eventBus, logger, getGeneration);
    const reconciler = new WatcherReconciler(eventBus, logger, this.fsProbe, getGeneration);
    this.watcherController = new WatcherController(
      eventBus,
      logger,
      workspace,
      reconciler,
      getGeneration
    );
    this.fileTreeQuery = new FileTreeQuery(this.fsProbe, workspace);
  }

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
    if (this.activeRootPath === rootPath && this.indexStore && this.watcherController.isActive()) {
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

    // Always reconcile disk vs index on cold start. `cleanExit` records only
    // that the previous session exited gracefully — it makes no claim about
    // the on-disk state, which may have changed while the app was closed.
    void this.scanRunner
      .performInitialScan(store, rootPath, compiled, myGeneration)
      .then(() => {
        if (myGeneration !== this.generation) return;
        try {
          this.watcherController.install(store, rootPath, compiled, myGeneration);
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

    this.logger.info('file session activated', {
      rootPath,
      activationMs: Date.now() - activationStart,
      cleanExit,
    });
  }

  async deactivateSession(): Promise<void> {
    this.generation += 1;
    await this.watcherController.stop();
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
    return this.fileTreeQuery.getFileTree(store, rootPath, workspaceId, parentPath);
  }

  async getIgnoredFiles(workspaceId: string): Promise<string[]> {
    this.assertActiveSession(workspaceId);
    return this.fileTreeQuery.getIgnoredFiles(workspaceId);
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
    await this.watcherController.restart(store, rootPath);
  }

  private assertActiveSession(workspaceId: string): FileIndexStore {
    if (this.activeRootPath === null || this.activeRootPath !== workspaceId || !this.indexStore) {
      throw sessionMismatch();
    }
    return this.indexStore;
  }
}