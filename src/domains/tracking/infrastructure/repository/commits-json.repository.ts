import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { CommitId } from '../../domain/value-objects/commit-id';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';
import { HashValue } from '../../domain/value-objects/hash-value';
import { DateTime } from '../../../shared-kernel/types/date-time';

interface CommitEntrySchema {
  id: string;
  fileHashes: { id: string; filePath: string; hashValue: string; }[];
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
  private cache: CommitsIndexSchema | null = null;
  private writeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY_MS = 300;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findById(id: CommitId): Promise<GranularCommit | null> {
    const index = await this.readIndex();
    const entry = index.commits.find(c => c.id === id.value);
    return entry ? this.mapToEntity(entry) : null;
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
    this.scheduleWrite();
  }

  async findAll(): Promise<GranularCommit[]> {
    const index = await this.readIndex();
    return index.commits.map(e => this.mapToEntity(e));
  }

  private async readIndex(): Promise<CommitsIndexSchema> {
    if (this.cache) return this.cache;
    try {
      const data = await this.db.read<CommitsIndexSchema>(COMMITS_INDEX_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      this.cache = migrated as unknown as CommitsIndexSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = { version: SCHEMA_VERSION, commits: [] };
      } else {
        throw error;
      }
    }
    return this.cache!;
  }

  private scheduleWrite(): void {
    if (this.writeDebounceTimer) clearTimeout(this.writeDebounceTimer);
    this.writeDebounceTimer = setTimeout(async () => {
      if (this.cache) await this.db.write(COMMITS_INDEX_FILE, this.cache);
      this.writeDebounceTimer = null;
    }, this.DEBOUNCE_DELAY_MS);
  }

  private mapToEntity(entry: CommitEntrySchema): GranularCommit {
    const fileHashes = entry.fileHashes.map(fh => new FileHash(
      new FileHashId(fh.id),
      new TrackedFilePath(fh.filePath),
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