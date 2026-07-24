import { BrowserWindow } from 'electron';
import * as path from 'path';
import { ChokidarAdapter } from '../../src/domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { NodeFsAdapter } from '../../src/domains/filesystem/infrastructure/adapters/node-fs.adapter';
import { FileChangeReactionSaga } from '../../src/application/sagas/file-change-reaction.saga';
import { ProjectConfigJsonRepository } from '../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { JsonDatabase } from '../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../src/infrastructure/persistence/database-schema';
import { IgnorePattern } from '../../src/domains/filesystem/domain/value-objects/ignore-pattern';
import { FilePath } from '../../src/domains/filesystem/domain/value-objects/file-path';
import { LinkedDocumentQueryAdapter } from '../ipc/handlers/tracking/adapter'; 
import { WorkspaceId } from '../../src/domains/project/domain/value-objects/workspace-id';
import { EventBus } from '../../src/domains/shared-kernel/events/event-bus';
import { IgnorePatternsChangedEvent } from '../../src/domains/filesystem/domain/events/ignore-patterns-changed';
import { IDomainEventHandler } from '../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { FileSystemJsonRepository } from '../../src/domains/filesystem/infrastructure/repository/filesystem-json.repository';
import { IpcChannels } from '../ipc/channels';
import { DomainEvent } from '../../src/domains/shared-kernel/events/domain-event';

let currentWatcher: ChokidarAdapter | null = null;
let currentSaga: FileChangeReactionSaga | null = null;
let ignorePatternChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent> | null = null;
let uiUpdateHandler: IDomainEventHandler<DomainEvent> | null = null;
let uiUpdateDebounce: ReturnType<typeof setTimeout> | null = null;

function toWatcherGlob(pattern: string): string {
  if (pattern.endsWith('/')) {
    return `**/${pattern}**`;
  }
  return pattern;
}

/**
 * Startup reconciliation: remove any entries from file-index.json that
 * no longer correspond to a real file or folder on disk.
 * This eliminates ghost entries caused by missed Chokidar events or
 * offline folder moves.
 */
async function reconcileFileIndex(rootPath: string): Promise<void> {
  const db = new JsonDatabase(rootPath);
  const repo = new FileSystemJsonRepository(db);
  const fsAdapter = new NodeFsAdapter();

  const allNodes = await repo.findAll();
  const toDelete: string[] = [];

  for (const node of allNodes) {
    const absolutePath = path.join(rootPath, node.path.value);
    if (!fsAdapter.exists(absolutePath)) {
      toDelete.push(node.path.value);
    }
  }

  for (const relPath of toDelete) {
    // deleteByPath also removes all nested children – safe for directories
    await repo.deleteByPath(new FilePath(relPath));
  }

  if (toDelete.length > 0) {
    console.log(`[Reconcile] Removed ${toDelete.length} stale entries from file index.`);
  }

  // Ensure all pending writes are flushed before the watcher starts
  await repo.flush();
}

export async function startWatcher(rootPath: string): Promise<void> {
  await stopWatcher();

  await reconcileFileIndex(rootPath);

  const db = new JsonDatabase(rootPath);
  const configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
  const config = await configRepo.findByWorkspaceId(new WorkspaceId(rootPath));
  
  const ignorePatternStrings = config ? config.ignorePatterns : [];
  const globPatterns = ignorePatternStrings.map(toWatcherGlob);

  const ignorePatterns = globPatterns.map((p) => {
    try {
      return new IgnorePattern(p);
    } catch {
      return null;
    }
  }).filter((p): p is IgnorePattern => p !== null);

  currentWatcher = new ChokidarAdapter();
  currentWatcher.startWatching(rootPath, ignorePatterns);

  const linkedDocQuery = new LinkedDocumentQueryAdapter(rootPath);
  const fileSystemRepo = new FileSystemJsonRepository(db);

  currentSaga = new FileChangeReactionSaga(rootPath, linkedDocQuery, fileSystemRepo);
  currentSaga.register();

  const eventBus = EventBus.getInstance();

  // Notify frontend reactively when files change
  uiUpdateHandler = {
    handle: async (_event: DomainEvent): Promise<void> => {
      if (uiUpdateDebounce) clearTimeout(uiUpdateDebounce);
      uiUpdateDebounce = setTimeout(() => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && !windows[0].isDestroyed()) {
          windows[0].webContents.send(IpcChannels.FILESYSTEM_TREE_UPDATED);
        }
      }, 300); // Debounce UI updates to prevent thrashing
    },
  };
  
  eventBus.register('FileDiscovered', uiUpdateHandler);
  eventBus.register('FileModified', uiUpdateHandler);
  eventBus.register('FileDeleted', uiUpdateHandler);

  // Register listener for ignore pattern changes to restart the watcher
  ignorePatternChangedHandler = {
    handle: async (event: IgnorePatternsChangedEvent): Promise<void> => {
      await startWatcher(event.workspaceId.value);
    },
  };
  eventBus.register('IgnorePatternsChanged', ignorePatternChangedHandler);
}

export async function stopWatcher(): Promise<void> {
  if (currentWatcher) {
    currentWatcher.stopWatching();
    currentWatcher = null;
  }
  if (currentSaga) {
    currentSaga.unregister();
    currentSaga = null;
  }
  
  const eventBus = EventBus.getInstance();
  
  if (uiUpdateHandler) {
    eventBus.unregister('FileDiscovered', uiUpdateHandler);
    eventBus.unregister('FileModified', uiUpdateHandler);
    eventBus.unregister('FileDeleted', uiUpdateHandler);
    uiUpdateHandler = null;
  }
  
  if (ignorePatternChangedHandler) {
    eventBus.unregister('IgnorePatternsChanged', ignorePatternChangedHandler);
    ignorePatternChangedHandler = null;
  }
}