import { ChokidarAdapter } from '../../src/domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { FileChangeReactionSaga } from '../../src/application/sagas/file-change-reaction.saga';
import { ProjectConfigJsonRepository } from '../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { JsonDatabase } from '../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../src/infrastructure/persistence/database-schema';
import { IgnorePattern } from '../../src/domains/filesystem/domain/value-objects/ignore-pattern';
import { LinkedDocumentQueryAdapter } from '../ipc/handlers/tracking/adapter'; 
import { WorkspaceId } from '../../src/domains/project/domain/value-objects/workspace-id';
import { EventBus } from '../../src/domains/shared-kernel/events/event-bus';
import { IgnorePatternsChangedEvent } from '../../src/domains/filesystem/domain/events/ignore-patterns-changed';
import { IDomainEventHandler } from '../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { FileSystemJsonRepository } from '../../src/domains/filesystem/infrastructure/repository/filesystem-json.repository';

let currentWatcher: ChokidarAdapter | null = null;
let currentSaga: FileChangeReactionSaga | null = null;
let ignorePatternChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent> | null = null;

function toWatcherGlob(pattern: string): string {
  if (pattern.endsWith('/')) {
    return `**/${pattern}**`;
  }
  return pattern;
}

export async function startWatcher(rootPath: string): Promise<void> {
  await stopWatcher();

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

  // Register listener for ignore pattern changes to restart the watcher
  const eventBus = EventBus.getInstance();
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
  if (ignorePatternChangedHandler) {
    EventBus.getInstance().unregister('IgnorePatternsChanged', ignorePatternChangedHandler);
    ignorePatternChangedHandler = null;
  }
}