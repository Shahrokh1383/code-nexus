import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../domain/value-objects/hash-value';
import { ContentDiffDto } from '../../application/dto/content-diff.dto';

interface HashEntrySchema {
  id: string;
  filePath: string;
  hashValue: string;
  diff: ContentDiffDto | null;
}

interface TrackingIndexSchema {
  version: string;
  hashes: Record<string, HashEntrySchema>;
}

const TRACKING_INDEX_FILE = 'tracking-index.json';
const SCHEMA_VERSION = '1.1';

export class TrackingJsonRepository implements IHashRepository {
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
    return Object.values(index.hashes).map(e => this.mapHashEntryToEntity(e));
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

  async deleteHashByPath(filePath: FilePath): Promise<void> {
    const index = await this.readIndex();
    delete index.hashes[filePath.value];
    await this.writeIndex(index);
  }

  async deleteAllExcept(filePaths: Set<string>): Promise<void> {
    const index = await this.readIndex();
    const keysToRemove = Object.keys(index.hashes).filter(path => !filePaths.has(path));
    if (keysToRemove.length === 0) return;
    for (const key of keysToRemove) {
      delete index.hashes[key];
    }
    await this.writeIndex(index);
  }

  private async readIndex(): Promise<TrackingIndexSchema> {
    try {
      const data = await this.db.read<TrackingIndexSchema>(TRACKING_INDEX_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      return migrated as unknown as TrackingIndexSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SCHEMA_VERSION, hashes: {} };
      }
      throw error;
    }
  }

  private async writeIndex(index: TrackingIndexSchema): Promise<void> {
    await this.db.write(TRACKING_INDEX_FILE, index);
  }

  private mapHashEntryToEntity(entry: HashEntrySchema): FileHash {
    return new FileHash(
      new FileHashId(entry.id),
      new FilePath(entry.filePath),
      new HashValue(entry.hashValue)
    );
  }

  private mapHashEntityToEntry(
    fileHash: FileHash,
    existingDiff: ContentDiffDto | null = null,
    newDiff: ContentDiffDto | null | undefined = undefined
  ): HashEntrySchema {
    const diffToSave = newDiff !== undefined ? newDiff : existingDiff;
    return {
      id: fileHash.id.value,
      filePath: fileHash.filePath.value,
      hashValue: fileHash.hashValue.value,
      diff: diffToSave,
    };
  }
}