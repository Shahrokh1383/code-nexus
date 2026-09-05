import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';
import { HashValue } from '../../domain/value-objects/hash-value';

interface HashEntrySchema {
  id: string;
  filePath: string;
  currentHash: string;
  committedHash: string | null;
  isPending: boolean;
}

interface TrackingIndexSchema {
  version: string;
  hashes: Record<string, HashEntrySchema>;
}

const TRACKING_INDEX_FILE = 'tracking-index.json';
const SCHEMA_VERSION = '2.0';

export class TrackingJsonRepository implements IHashRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;
  private cache: TrackingIndexSchema | null = null;
  private writeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_DELAY_MS = 300;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
    this.registerMigrations();
  }

  private registerMigrations(): void {
    this.migrator.register('1.1', (data) => {
      const old = data as any;
      const oldHashes = old.hashes || {};
      const newHashes: Record<string, HashEntrySchema> = {};
      for (const [key, entry] of Object.entries(oldHashes)) {
        const oldEntry = entry as any;
        newHashes[key] = {
          id: oldEntry.id,
          filePath: oldEntry.filePath,
          currentHash: oldEntry.hashValue,
          committedHash: null,
          isPending: false,
        };
      }
      return { version: SCHEMA_VERSION, hashes: newHashes };
    });
  }

  async findHashByPath(filePath: TrackedFilePath): Promise<FileHash | null> {
    const index = await this.readIndex();
    const entry = index.hashes[filePath.value];
    if (!entry) return null;
    return this.mapHashEntryToEntity(entry);
  }

  async findAllHashes(): Promise<FileHash[]> {
    const index = await this.readIndex();
    return Object.values(index.hashes).map(e => this.mapHashEntryToEntity(e));
  }

  async saveHash(fileHash: FileHash): Promise<void> {
    const index = await this.readIndex();
    const existing = index.hashes[fileHash.filePath.value];
    index.hashes[fileHash.filePath.value] = this.mapHashEntityToEntry(fileHash, existing);
    this.scheduleWrite();
  }

  async updatePendingStatus(
    filePath: TrackedFilePath,
    isPending: boolean,
    committedHash?: string
  ): Promise<void> {
    const index = await this.readIndex();
    const entry = index.hashes[filePath.value];
    if (!entry) return;
    entry.isPending = isPending;
    if (committedHash !== undefined) {
      entry.committedHash = committedHash;
    }
    this.scheduleWrite();
  }

  async deleteHashByPath(filePath: TrackedFilePath): Promise<void> {
    const index = await this.readIndex();
    delete index.hashes[filePath.value];
    this.scheduleWrite();
  }

  async deleteAllExcept(filePaths: Set<string>): Promise<void> {
    const index = await this.readIndex();
    const keysToRemove = Object.keys(index.hashes).filter(path => !filePaths.has(path));
    if (keysToRemove.length === 0) return;
    for (const key of keysToRemove) {
      delete index.hashes[key];
    }
    this.scheduleWrite();
  }

  private async readIndex(): Promise<TrackingIndexSchema> {
    if (this.cache) return this.cache;
    try {
      const data = await this.db.read<TrackingIndexSchema>(TRACKING_INDEX_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      this.cache = migrated as unknown as TrackingIndexSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.cache = { version: SCHEMA_VERSION, hashes: {} };
      } else {
        throw error;
      }
    }
    return this.cache!;
  }

  private scheduleWrite(): void {
    if (this.writeDebounceTimer) {
      clearTimeout(this.writeDebounceTimer);
    }
    this.writeDebounceTimer = setTimeout(async () => {
      if (this.cache) {
        await this.db.write(TRACKING_INDEX_FILE, this.cache);
      }
      this.writeDebounceTimer = null;
    }, this.DEBOUNCE_DELAY_MS);
  }

  private mapHashEntryToEntity(entry: HashEntrySchema): FileHash {
    return new FileHash(
      new FileHashId(entry.id),
      new TrackedFilePath(entry.filePath),
      new HashValue(entry.currentHash),
      entry.isPending
    );
  }

  private mapHashEntityToEntry(
    fileHash: FileHash,
    existing?: HashEntrySchema
  ): HashEntrySchema {
    return {
      id: fileHash.id.value,
      filePath: fileHash.filePath.value,
      currentHash: fileHash.hashValue.value,
      committedHash: existing?.committedHash ?? null,
      isPending: existing?.isPending ?? false,
    };
  }
}