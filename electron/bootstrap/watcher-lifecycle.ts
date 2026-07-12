import { ChokidarAdapter } from '../../src/domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { FileChangeReactionSaga } from '../../src/application/sagas/file-change-reaction.saga';
import { ProjectConfigJsonRepository } from '../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { JsonDatabase } from '../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../src/infrastructure/persistence/database-schema';
import { IgnorePattern } from '../../src/domains/filesystem/domain/value-objects/ignore-pattern';
import { ILinkedDocumentQueryPort } from '../../src/domains/tracking/application/ports/linked-document-query.port';
import { DocumentId } from '../../src/domains/documentation/domain/value-objects/document-id';
import { WorkspaceId } from '../../src/domains/project/domain/value-objects/workspace-id';

class StubLinkedDocumentQueryPort implements ILinkedDocumentQueryPort {
  async findLinkedDocuments(_filePath: string): Promise<DocumentId[]> { return []; }
  async findLinkedFiles(_documentId: string): Promise<string[]> { return []; }
}

let currentWatcher: ChokidarAdapter | null = null;
let currentSaga: FileChangeReactionSaga | null = null;

/**
 * Converts directory‑only ignore patterns (ending with '/')
 * into recursive globs that Chokidar will apply to all nested files.
 * Example: '.doclink/' -> '** /.doclink/**' (spaces added to prevent formatting)
 */
function toWatcherGlob(pattern: string): string {
  if (pattern.endsWith('/')) {
    // Match any path that contains the directory at any depth
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

  // Create IgnorePattern objects for the scan service (they handle matching internally)
  const ignorePatterns = globPatterns.map((p) => {
    try {
      return new IgnorePattern(p);
    } catch {
      return null;
    }
  }).filter((p): p is IgnorePattern => p !== null);

  currentWatcher = new ChokidarAdapter();
  currentWatcher.startWatching(rootPath, ignorePatterns);

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