import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { FileHash } from '../../domain/entities/file-hash';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../domain/value-objects/hash-value';
import { CommitId } from '../../domain/value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../domain/value-objects/commit-status';
import { ContentDiffDto } from '../../application/dto/content-diff.dto';

interface HashEntrySchema {
  id: string;
  filePath: string;
  hashValue: string;
  committedAt: string | null;
  commitId: string | null;
  diff: ContentDiffDto | null; // NEW: Stores lightweight diff metadata
}

interface CommitEntrySchema {
  id: string;
  documentId: string;
  fileHashIds: string[];
  committedAt: string;
  status: 'PENDING' | 'APPROVED';
}

interface TrackingIndexSchema {
  version: string;
  hashes: Record<string, HashEntrySchema>;
  commits: CommitEntrySchema[];
}

const TRACKING_INDEX_FILE = 'tracking-index.json';
const SCHEMA_VERSION = '1.0';

export class TrackingJsonRepository implements ITrackingRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findHashByPath(filePath: FilePath): Promise<FileHash | null> {
    const index = await this.readIndex();
    const entry = index.hashes[filePath.value];
    if (!entry) return null;
    return this.mapHashEntryToEntity(entry);
  }

  async findAllHashes(): Promise<FileHash[]> {
    const index = await this.readIndex();
    return Object.values(index.hashes).map((e) => this.mapHashEntryToEntity(e));
  }

  async saveHash(fileHash: FileHash, diff?: ContentDiffDto | null): Promise<void> {
    const index = await this.readIndex();
    const existing = index.hashes[fileHash.filePath.value];
    index.hashes[fileHash.filePath.value] = this.mapHashEntityToEntry(fileHash, existing?.diff, diff);
    await this.writeIndex(index);
  }

  async findDiffByPath(filePath: FilePath): Promise<ContentDiffDto | null> {
    const index = await this.readIndex();
    const entry = index.hashes[filePath.value];
    if (!entry) return null;
    return entry.diff;
  }

  async findCommitById(commitId: CommitId): Promise<GranularCommit | null> {
    const index = await this.readIndex();
    const entry = index.commits.find((c) => c.id === commitId.value);
    if (!entry) return null;
    return this.mapCommitEntryToEntity(entry, index);
  }

  async saveCommit(commit: GranularCommit): Promise<void> {
    const index = await this.readIndex();
    const existingIndex = index.commits.findIndex((c) => c.id === commit.id.value);
    const entry = this.mapCommitEntityToEntry(commit);
    if (existingIndex >= 0) {
      index.commits[existingIndex] = entry;
    } else {
      index.commits.push(entry);
    }
    await this.writeIndex(index);
  }

  async findPendingCommits(): Promise<GranularCommit[]> {
    const index = await this.readIndex();
    return index.commits.filter((c) => c.status === 'PENDING').map((c) => this.mapCommitEntryToEntity(c, index));
  }

  async findCommitsByDocument(documentId: DocumentId): Promise<GranularCommit[]> {
    const index = await this.readIndex();
    return index.commits.filter((c) => c.documentId === documentId.value).map((c) => this.mapCommitEntryToEntity(c, index));
  }

  private async readIndex(): Promise<TrackingIndexSchema> {
    try {
        const data = await this.db.read<TrackingIndexSchema>(TRACKING_INDEX_FILE);
        const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
        return migrated as unknown as TrackingIndexSchema;
    } catch {
        return { version: SCHEMA_VERSION, hashes: {}, commits: [] };
    }
  }

  private async writeIndex(index: TrackingIndexSchema): Promise<void> {
    await this.db.write(TRACKING_INDEX_FILE, index);
  }

  private mapHashEntryToEntity(entry: HashEntrySchema): FileHash {
    return new FileHash(
      new FileHashId(entry.id),
      new FilePath(entry.filePath),
      new HashValue(entry.hashValue),
      entry.committedAt ? DateTime.fromISO(entry.committedAt) : undefined,
      entry.commitId ? new CommitId(entry.commitId) : undefined
    );
  }

  private mapHashEntityToEntry(fileHash: FileHash, existingDiff: ContentDiffDto | null = null, newDiff: ContentDiffDto | null | undefined = undefined): HashEntrySchema {
    const diffToSave = newDiff !== undefined ? newDiff : existingDiff;
    return {
      id: fileHash.id.value,
      filePath: fileHash.filePath.value,
      hashValue: fileHash.hashValue.value,
      committedAt: fileHash.committedAt.isSome ? fileHash.committedAt.getOrNull()!.toISO() : null,
      commitId: fileHash.commitId.isSome ? fileHash.commitId.getOrNull()!.value : null,
      diff: diffToSave
    };
  }

  private mapCommitEntryToEntity(entry: CommitEntrySchema, index: TrackingIndexSchema): GranularCommit {
    const fileHashes = entry.fileHashIds
      .map((id) => Object.values(index.hashes).find((h) => h.id === id))
      .filter((h): h is HashEntrySchema => !!h)
      .map((h) => this.mapHashEntryToEntity(h));

    return new GranularCommit(
      new CommitId(entry.id),
      new DocumentId(entry.documentId),
      fileHashes,
      DateTime.fromISO(entry.committedAt),
      entry.status === 'APPROVED' ? CommitStatus.approved() : CommitStatus.pending()
    );
  }

  private mapCommitEntityToEntry(commit: GranularCommit): CommitEntrySchema {
    return {
      id: commit.id.value,
      documentId: commit.documentId.value,
      fileHashIds: commit.fileHashes.map((h) => h.id.value),
      committedAt: commit.committedAt.toISO(),
      status: commit.status.isApproved ? 'APPROVED' : 'PENDING',
    };
  }
}