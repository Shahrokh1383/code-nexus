// electron/bootstrap/watcher-lifecycle.ts
import { ChokidarAdapter } from '../../src/domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { FileChangeReactionSaga } from '../../src/application/sagas/file-change-reaction.saga';
import { ProjectConfigJsonRepository } from '../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { JsonDatabase } from '../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../src/infrastructure/persistence/database-schema';
import { IgnorePattern } from '../../src/domains/filesystem/domain/value-objects/ignore-pattern';
import { ILinkedDocumentQueryPort } from '../../src/domains/tracking/application/ports/linked-document-query.port';
import { DocumentId } from '../../src/domains/documentation/domain/value-objects/document-id';
import { EventBus } from '../../src/domains/shared-kernel/events/event-bus';
import { WorkspaceClosedEvent } from '../../src/domains/project/domain/events/workspace-closed';
import { WorkspaceId } from '../../src/domains/project/domain/value-objects/workspace-id';

// Stub for the not-yet-implemented Linking context
class StubLinkedDocumentQueryPort implements ILinkedDocumentQueryPort {
  async findLinkedDocuments(_filePath: string): Promise<DocumentId[]> { return []; }
  async findLinkedFiles(_documentId: string): Promise<string[]> { return []; }
}

let currentWatcher: ChokidarAdapter | null = null;
let currentSaga: FileChangeReactionSaga | null = null;

export async function startWatcher(rootPath: string): Promise<void> {
  // Ensure any previous watcher is stopped
  await stopWatcher();

  // Read project config to get ignore patterns
  const db = new JsonDatabase(rootPath);
  const configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
  const config = await configRepo.findByWorkspaceId(new WorkspaceId(rootPath));
  
  const ignorePatternStrings = config ? config.ignorePatterns : [];
  const ignorePatterns = ignorePatternStrings.map((p) => {
    try {
      return new IgnorePattern(p);
    } catch {
      return null;
    }
  }).filter((p): p is IgnorePattern => p !== null);

  // Start file watcher
  currentWatcher = new ChokidarAdapter();
  currentWatcher.startWatching(rootPath, ignorePatterns);

  // Start the tracking saga
  const linkedDocQuery = new StubLinkedDocumentQueryPort();
  currentSaga = new FileChangeReactionSaga(rootPath, linkedDocQuery);
  currentSaga.register();
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
}