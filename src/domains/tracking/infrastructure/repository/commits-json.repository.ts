import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { CommitId } from '../../domain/value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../domain/value-objects/hash-value';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../domain/value-objects/commit-status';

interface CommitEntrySchema {
  id: string;
  documentId: string;
  fileHashIds: string[];
  filePaths: string[];
  hashValues: string[];
  committedAt: string;
  status: 'PENDING' | 'APPROVED';
}

interface CommitsIndexSchema {
  version: string;
  commits: CommitEntrySchema[];
}

const COMMITS_INDEX_FILE = 'commits.json';
const SCHEMA_VERSION = '1.0';

export class CommitsJsonRepository implements ICommitRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findById(id: CommitId): Promise<GranularCommit | null> {
    const index = await this.readIndex();
    const entry = index.commits.find((c) => c.id === id.value);
    if (!entry) return null;
    return this.mapToEntity(entry);
  }

  async findByDocument(documentId: DocumentId): Promise<GranularCommit[]> {
    const index = await this.readIndex();
    return index.commits
      .filter((c) => c.documentId === documentId.value)
      .map((e) => this.mapToEntity(e));
  }

  async save(commit: GranularCommit): Promise<void> {
    const index = await this.readIndex();
    const entryIndex = index.commits.findIndex((c) => c.id === commit.id.value);
    const entry = this.mapToEntry(commit);
    if (entryIndex >= 0) {
      index.commits[entryIndex] = entry;
    } else {
      index.commits.push(entry);
    }
    await this.writeIndex(index);
  }

  async findAll(): Promise<GranularCommit[]> {
    const index = await this.readIndex();
    return index.commits.map((e) => this.mapToEntity(e));
  }

  private async readIndex(): Promise<CommitsIndexSchema> {
    try {
      const data = await this.db.read<CommitsIndexSchema>(COMMITS_INDEX_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      return migrated as unknown as CommitsIndexSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SCHEMA_VERSION, commits: [] };
      }
      throw error;
    }
  }

  private async writeIndex(index: CommitsIndexSchema): Promise<void> {
    await this.db.write(COMMITS_INDEX_FILE, index);
  }

  private mapToEntity(entry: CommitEntrySchema): GranularCommit {
    const fileHashes = entry.filePaths.map((path, idx) => {
      const hashId = entry.fileHashIds[idx] ?? '';
      const hashValue = entry.hashValues[idx] ?? '';
      return new FileHash(
        new FileHashId(hashId),
        new FilePath(path),
        new HashValue(hashValue),
        undefined,                 // committedHashValue not available in commit history
        undefined,                 // committedCommitId not available in commit history
        DateTime.now(),
        new CommitId(entry.id)
      );
    });
    return new GranularCommit(
      new CommitId(entry.id),
      new DocumentId(entry.documentId),
      fileHashes,
      DateTime.fromISO(entry.committedAt),
      entry.status === 'APPROVED' ? CommitStatus.approved() : CommitStatus.pending()
    );
  }

  private mapToEntry(commit: GranularCommit): CommitEntrySchema {
    return {
      id: commit.id.value,
      documentId: commit.documentId.value,
      fileHashIds: commit.fileHashes.map((h) => h.id.value),
      filePaths: commit.fileHashes.map((h) => h.filePath.value),
      hashValues: commit.fileHashes.map((h) => h.hashValue.value),
      committedAt: commit.committedAt.toISO(),
      status: commit.status.isApproved ? 'APPROVED' : 'PENDING',
    };
  }
}