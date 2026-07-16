import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { CommitId } from '../../domain/value-objects/commit-id';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../domain/value-objects/hash-value';
import { DateTime } from '../../../shared-kernel/types/date-time';

interface CommitEntrySchema {
  id: string;
  fileHashes: {
    id: string;
    filePath: string;
    hashValue: string;
  }[];
  committedAt: string;
}

interface CommitsIndexSchema {
  version: string;
  commits: CommitEntrySchema[];
}

const COMMITS_INDEX_FILE = 'commits.json';
const SCHEMA_VERSION = '1.1';

export class CommitsJsonRepository implements ICommitRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findById(id: CommitId): Promise<GranularCommit | null> {
    const index = await this.readIndex();
    const entry = index.commits.find(c => c.id === id.value);
    if (!entry) return null;
    return this.mapToEntity(entry);
  }

  async save(commit: GranularCommit): Promise<void> {
    const index = await this.readIndex();
    const existingIdx = index.commits.findIndex(c => c.id === commit.id.value);
    const entry = this.mapToEntry(commit);
    if (existingIdx >= 0) {
      index.commits[existingIdx] = entry;
    } else {
      index.commits.push(entry);
    }
    await this.writeIndex(index);
  }

  async findAll(): Promise<GranularCommit[]> {
    const index = await this.readIndex();
    return index.commits.map(e => this.mapToEntity(e));
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
    const fileHashes = entry.fileHashes.map(fh => new FileHash(
      new FileHashId(fh.id),
      new FilePath(fh.filePath),
      new HashValue(fh.hashValue)
    ));
    return new GranularCommit(
      new CommitId(entry.id),
      fileHashes,
      DateTime.fromISO(entry.committedAt)
    );
  }

  private mapToEntry(commit: GranularCommit): CommitEntrySchema {
    return {
      id: commit.id.value,
      fileHashes: commit.fileHashes.map(fh => ({
        id: fh.id.value,
        filePath: fh.filePath.value,
        hashValue: fh.hashValue.value
      })),
      committedAt: commit.committedAt.toISO()
    };
  }
}