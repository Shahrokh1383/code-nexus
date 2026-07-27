import { BrowserWindow } from 'electron';
import * as path from 'path';
import { ChokidarAdapter } from '../../src/domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { NodeFsAdapter } from '../../src/domains/filesystem/infrastructure/adapters/node-fs.adapter';
import { FileChangeReactionSaga } from '../../src/application/sagas/file-change-reaction.saga';
import { ProjectConfigJsonRepository } from '../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { WorkspaceJsonRepository } from '../../src/domains/project/infrastructure/repository/workspace-json.repository';
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
import { TrackingJsonRepository } from '../../src/domains/tracking/infrastructure/repository/tracking-json.repository';
import { CommitsJsonRepository } from '../../src/domains/tracking/infrastructure/repository/commits-json.repository';
import { DocumentCommitApprovalJsonRepository } from '../../src/domains/tracking/infrastructure/repository/document-commit-approval-json.repository';
import { LinkJsonRepository } from '../../src/domains/linking/infrastructure/repository/link-json.repository';
import { FileContentReaderAdapter } from '../../src/domains/tracking/infrastructure/adapters/file-content-reader.adapter';
import { DiffCalculatorAdapter } from '../../src/domains/tracking/infrastructure/adapters/diff-calculator.adapter';
import { DiffCalculatorService } from '../../src/domains/tracking/domain/services/diff-calculator.service';
import { CommitMatcherService } from '../../src/domains/tracking/domain/services/commit-matcher.service';
import { setWorkspaceContext, clearWorkspaceContext, WorkspaceContext } from '../ipc/handlers/tracking/workspace-context';
import { IpcChannels } from '../ipc/channels';
import { DomainEvent } from '../../src/domains/shared-kernel/events/domain-event';

let currentWatcher: ChokidarAdapter | null = null;
let currentSaga: FileChangeReactionSaga | null = null;
let ignorePatternChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent> | null = null;
let uiUpdateHandler: IDomainEventHandler<DomainEvent> | null = null;
let uiUpdateDebounce: ReturnType<typeof setTimeout> | null = null;

async function reconcileFileIndex(rootPath: string, repo: FileSystemJsonRepository): Promise<void> {
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
    await repo.deleteByPath(new FilePath(relPath));
  }

  if (toDelete.length > 0) {
    console.log(`[Reconcile] Removed ${toDelete.length} stale entries from file index.`);
  }
  await repo.flush();
}

export async function startWatcher(rootPath: string, userDataPath: string): Promise<void> {
  await stopWatcher();

  const db = new JsonDatabase(rootPath);
  await db.ensureDoclinkExists();
  
  const fileSystemRepo = new FileSystemJsonRepository(db);
  await reconcileFileIndex(rootPath, fileSystemRepo);

  const configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
  const config = await configRepo.findByWorkspaceId(new WorkspaceId(rootPath));
  
  const ignorePatternStrings = config ? config.ignorePatterns : [];
  
  // Remove any file‑index entries that match current ignore patterns
  for (const raw of ignorePatternStrings) {
    try {
      const ip = new IgnorePattern(raw);
      await fileSystemRepo.deleteByPattern(ip);
    } catch {
      // ignore invalid patterns
    }
  }
  await fileSystemRepo.flush();   // persist immediately

  // Build IgnorePattern objects directly from raw strings
  const ignorePatterns = ignorePatternStrings
    .map(p => { try { return new IgnorePattern(p); } catch { return null; } })
    .filter((p): p is IgnorePattern => p !== null);

  // Instantiate Infrastructure Adapters & Repositories
  const fileWatcher = new ChokidarAdapter();
  fileWatcher.startWatching(rootPath, ignorePatterns);
  currentWatcher = fileWatcher;

  const hashRepo = new TrackingJsonRepository(rootPath);
  const commitRepo = new CommitsJsonRepository(rootPath);
  const approvalRepo = new DocumentCommitApprovalJsonRepository(rootPath);
  const contentReader = new FileContentReaderAdapter(rootPath, userDataPath);
  const diffService = new DiffCalculatorService(new DiffCalculatorAdapter());
  const commitMatcher = new CommitMatcherService();
  
  const linkRepo = new LinkJsonRepository(rootPath);
  const linkedDocQuery = new LinkedDocumentQueryAdapter(linkRepo, fileSystemRepo);

  const workspaceId = new WorkspaceId(rootPath);

  const context: WorkspaceContext = {
    rootPath, db, 
    workspaceRepo: new WorkspaceJsonRepository(db), 
    configRepo, fileSystemRepo, fileWatcher,
    hashRepo, commitRepo, approvalRepo, 
    linkedDocQuery, contentReader, diffService, commitMatcher
  };
  setWorkspaceContext(context);

  // Saga with ignore-pattern filtering capability
  currentSaga = new FileChangeReactionSaga(
    linkedDocQuery,
    fileSystemRepo,
    hashRepo,
    contentReader,
    diffService,
    configRepo,
    workspaceId
  );
  currentSaga.register();

  const eventBus = EventBus.getInstance();

  uiUpdateHandler = {
    handle: async (_event: DomainEvent): Promise<void> => {
      if (uiUpdateDebounce) clearTimeout(uiUpdateDebounce);
      uiUpdateDebounce = setTimeout(() => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && !windows[0].isDestroyed()) {
          windows[0].webContents.send(IpcChannels.FILESYSTEM_TREE_UPDATED);
        }
      }, 300);
    },
  };
  
  eventBus.register('FileDiscovered', uiUpdateHandler);
  eventBus.register('FileModified', uiUpdateHandler);
  eventBus.register('FileDeleted', uiUpdateHandler);

  ignorePatternChangedHandler = {
    handle: async (event: IgnorePatternsChangedEvent): Promise<void> => {
      await startWatcher(event.workspaceId.value, userDataPath);
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

  clearWorkspaceContext();
}