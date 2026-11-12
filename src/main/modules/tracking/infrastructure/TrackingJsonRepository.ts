import { join } from 'path';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { FileHash, FileHashId, HashValue } from '../domain/FileHash';
import { TrackedFilePath } from '../domain/TrackedFilePath';

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

const TRACKING_INDEX_FILENAME = 'tracking-index.json';
const SCHEMA_VERSION = '2.0';
const DEBOUNCE_DELAY_MS = 300;

export class TrackingJsonRepository {
  private readonly caches = new Map<string, TrackingIndexSchema>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly files: AtomicJsonFile) {}

  async findHashByPath(rootPath: string, filePath: TrackedFilePath): Promise<FileHash | null> {
    const index = await this.readIndex(rootPath);
    const entry = index.hashes[filePath.value];
    return entry ? this.toEntity(entry) : null;
  }

  async findAllHashes(rootPath: string): Promise<FileHash[]> {
    const index = await this.readIndex(rootPath);
    return Object.values(index.hashes).map((e) => this.toEntity(e));
  }

  async saveHash(rootPath: string, fileHash: FileHash): Promise<void> {
    const index = await this.readIndex(rootPath);
    const existing = index.hashes[fileHash.filePath.value];
    index.hashes[fileHash.filePath.value] = {
      id: fileHash.id.value,
      filePath: fileHash.filePath.value,
      currentHash: fileHash.hashValue.value,
      committedHash: existing?.committedHash ?? null,
      isPending: fileHash.isPending ?? existing?.isPending ?? false,
    };
    this.scheduleWrite(rootPath);
  }

  async updatePendingStatus(
    rootPath: string,
    filePath: TrackedFilePath,
    isPending: boolean,
    committedHash?: string,
  ): Promise<void> {
    const index = await this.readIndex(rootPath);
    const entry = index.hashes[filePath.value];
    if (!entry) return;
    entry.isPending = isPending;
    if (committedHash !== undefined) entry.committedHash = committedHash;
    this.scheduleWrite(rootPath);
  }

  async deleteHashByPath(rootPath: string, filePath: TrackedFilePath): Promise<void> {
    const index = await this.readIndex(rootPath);
    delete index.hashes[filePath.value];
    this.scheduleWrite(rootPath);
  }

  async deleteAllExcept(rootPath: string, filePaths: ReadonlySet<string>): Promise<void> {
    const index = await this.readIndex(rootPath);
    const remove = Object.keys(index.hashes).filter((p) => !filePaths.has(p));
    if (remove.length === 0) return;
    for (const key of remove) delete index.hashes[key];
    this.scheduleWrite(rootPath);
  }

  async flush(rootPath: string): Promise<void> {
    const timer = this.debounceTimers.get(rootPath);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(rootPath);
    }
    const cache = this.caches.get(rootPath);
    if (cache) await this.files.writeJson(this.indexPath(rootPath), cache);
  }

  private indexPath(rootPath: string): string {
    return join(rootPath, TRACKING_INDEX_FILENAME);
  }

  private async readIndex(rootPath: string): Promise<TrackingIndexSchema> {
    const cached = this.caches.get(rootPath);
    if (cached) return cached;

    let index: TrackingIndexSchema;
    try {
      const raw = await this.files.readJson<TrackingIndexSchema & { version: string }>(
        this.indexPath(rootPath),
      );
      index = this.migrate(raw);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        index = { version: SCHEMA_VERSION, hashes: {} };
      } else {
        throw error;
      }
    }
    this.caches.set(rootPath, index);
    return index;
  }

  private migrate(raw: TrackingIndexSchema & { version: string }): TrackingIndexSchema {
    if (raw.version === SCHEMA_VERSION) return raw;
    if (raw.version === '1.1') {
      const oldHashes = (raw.hashes ?? {}) as Record<string, unknown>;
      const hashes: Record<string, HashEntrySchema> = {};
      for (const [key, entry] of Object.entries(oldHashes)) {
        const old = entry as { id: string; filePath: string; hashValue: string };
        hashes[key] = {
          id: old.id,
          filePath: old.filePath,
          currentHash: old.hashValue,
          committedHash: null,
          isPending: false,
        };
      }
      return { version: SCHEMA_VERSION, hashes };
    }
    return { version: SCHEMA_VERSION, hashes: {} };
  }

  private scheduleWrite(rootPath: string): void {
    const existing = this.debounceTimers.get(rootPath);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(rootPath);
      const cache = this.caches.get(rootPath);
      if (cache) await this.files.writeJson(this.indexPath(rootPath), cache);
    }, DEBOUNCE_DELAY_MS);
    this.debounceTimers.set(rootPath, timer);
  }

  private toEntity(entry: HashEntrySchema): FileHash {
    return new FileHash(
      new FileHashId(entry.id),
      new TrackedFilePath(entry.filePath),
      new HashValue(entry.currentHash),
      entry.isPending,
    );
  }
}