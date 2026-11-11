import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { PathUtils } from '../../../shared/utils/path-utils';
import type { Logger } from '../../../shared/logger/logger';
import type { IgnorePattern } from '../domain/ignore-pattern';
import { FileIndexCache } from './file-index-cache';
import { FileIndexMutations } from './file-index-mutations';
import { FileIndexPersistence } from './file-index-persistence';
import type { FileIndexEntry, IndexedPath } from './file-index-types';

export type { FileIndexEntry, IndexedPath } from './file-index-types';

export class FileIndexStore {
  private readonly cache: FileIndexCache;
  private readonly persistence: FileIndexPersistence;
  private readonly mutations: FileIndexMutations;

  constructor(
    rootPath: string,
    file: AtomicJsonFile,
    private readonly logger: Logger
  ) {
    const filePath = PathUtils.join(rootPath, '.doclink', 'file-index.json');
    this.cache = new FileIndexCache(filePath, file, logger);
    this.persistence = new FileIndexPersistence(
      filePath,
      file,
      logger,
      () => this.cache.getSnapshot()
    );
    this.mutations = new FileIndexMutations(this.cache, this.persistence);
  }

  markScanStart(): void {
    this.persistence.markScanStart();
  }

  markScanEnd(): void {
    this.persistence.markScanEnd();
  }

  async ensureExists(): Promise<void> {
    if (this.persistence.isDirty()) await this.persistence.flush();
    this.cache.invalidate();
    await this.cache.read();
    if (this.cache.getFileExisted()) return;
    await this.persistence.writeIndex();
    this.logger.info('file-index initialized', { path: this.cache.getFilePath() });
  }

  setLastScan(iso: string): void {
    const snapshot = this.cache.getSnapshot();
    if (!snapshot) return;
    snapshot.lastScan = iso;
    this.persistence.markDirty();
  }

  async getLastScan(): Promise<string | null> {
    const index = await this.cache.read();
    return index.lastScan;
  }

  async getCleanExit(): Promise<boolean> {
    const index = await this.cache.read();
    return index.cleanExit === true;
  }

  async markCleanExit(): Promise<void> {
    const snapshot = this.cache.getSnapshot();
    if (!snapshot) return;
    if (snapshot.cleanExit === true && !this.persistence.isDirty()) return;
    snapshot.cleanExit = true;
    this.persistence.markDirty();
    await this.persistence.flush();
  }

  async findByPath(path: string): Promise<FileIndexEntry | null> {
    return this.cache.findByPath(path);
  }

  async listEntries(): Promise<IndexedPath[]> {
    return this.cache.listEntries();
  }

  async *listEntriesIterable(): AsyncGenerator<IndexedPath, void, void> {
    yield* this.cache.listEntriesIterable();
  }

  async findChildrenOf(
    parentPath: string,
    limit: number = Number.POSITIVE_INFINITY
  ): Promise<IndexedPath[]> {
    return this.cache.findChildrenOf(parentPath, limit);
  }

  async upsertFile(path: string): Promise<boolean> {
    return this.mutations.upsertFile(path);
  }

  async upsertFolder(path: string): Promise<boolean> {
    return this.mutations.upsertFolder(path);
  }

  async deleteByPath(path: string): Promise<void> {
    return this.mutations.deleteByPath(path);
  }

  async deleteBatch(paths: readonly string[]): Promise<void> {
    return this.mutations.deleteBatch(paths);
  }

  async deleteByPattern(pattern: IgnorePattern): Promise<string[]> {
    return this.mutations.deleteByPattern(pattern);
  }

  async bulkUpsert(
    entries: ReadonlyArray<{ path: string; isDirectory: boolean }>
  ): Promise<void> {
    return this.mutations.bulkUpsert(entries);
  }

  async flush(): Promise<void> {
    await this.persistence.flush();
  }
}