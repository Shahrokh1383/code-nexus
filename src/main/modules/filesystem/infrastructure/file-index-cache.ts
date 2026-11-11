import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { Logger } from '../../../shared/logger/logger';
import {
  emptyIndex,
  type FileIndexEntry,
  type FileIndexFile,
  type IndexedPath,
} from './file-index-types';

const ITER_YIELD_INTERVAL = 1000;

export class FileIndexCache {
  private cache: FileIndexFile | null = null;
  private childrenByParent: Map<string, IndexedPath[]> | null = null;
  private fileExisted = false;

  constructor(
    private readonly filePath: string,
    private readonly file: AtomicJsonFile,
    private readonly logger: Logger
  ) {}

  getFilePath(): string {
    return this.filePath;
  }

  getFileExisted(): boolean {
    return this.fileExisted;
  }

  getSnapshot(): FileIndexFile | null {
    return this.cache;
  }

  invalidate(): void {
    this.cache = null;
    this.childrenByParent = null;
  }

  async read(): Promise<FileIndexFile> {
    if (this.cache) return this.cache;
    try {
      this.cache = await this.file.readJson<FileIndexFile>(this.filePath);
      this.fileExisted = true;
      if (typeof this.cache.cleanExit !== 'boolean') {
        this.cache.cleanExit = false;
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'ENOENT') {
        this.logger.warn('file-index read failed, rebuilding', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
      this.cache = emptyIndex();
      this.fileExisted = false;
    }
    return this.cache;
  }

  async findByPath(path: string): Promise<FileIndexEntry | null> {
    const index = await this.read();
    return index.files[path] ?? null;
  }

  async listEntries(): Promise<IndexedPath[]> {
    const index = await this.read();
    return Object.entries(index.files).map(([path, entry]) => ({ path, entry }));
  }

  async *listEntriesIterable(): AsyncGenerator<IndexedPath, void, void> {
    const index = await this.read();
    let sinceYield = 0;
    for (const path of Object.keys(index.files)) {
      yield { path, entry: index.files[path] };
      sinceYield++;
      if (sinceYield >= ITER_YIELD_INTERVAL) {
        sinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
  }

  async findChildrenOf(
    parentPath: string,
    limit: number = Number.POSITIVE_INFINITY
  ): Promise<IndexedPath[]> {
    await this.read();
    if (!this.childrenByParent) this.rebuildChildrenCache();
    const bucket = this.childrenByParent?.get(parentPath) ?? [];
    if (limit === Number.POSITIVE_INFINITY || bucket.length <= limit) return bucket;
    return bucket.slice(0, limit);
  }

  patchChildCache(path: string, entry: FileIndexEntry, isNew: boolean): void {
    if (!this.childrenByParent) return;
    const lastSlash = path.lastIndexOf('/');
    const parent = lastSlash === -1 ? '.' : path.slice(0, lastSlash);
    const bucket = this.childrenByParent.get(parent);
    const indexedPath: IndexedPath = { path, entry };
    if (!bucket) {
      this.childrenByParent.set(parent, [indexedPath]);
      return;
    }
    if (isNew) {
      bucket.push(indexedPath);
      return;
    }
    const existingIdx = bucket.findIndex((c) => c.path === path);
    if (existingIdx >= 0) bucket[existingIdx] = indexedPath;
    else bucket.push(indexedPath);
  }

  invalidateChildrenCache(): void {
    this.childrenByParent = null;
  }

  private rebuildChildrenCache(): void {
    if (!this.cache) {
      this.childrenByParent = new Map();
      return;
    }
    const map = new Map<string, IndexedPath[]>();
    for (const [path, entry] of Object.entries(this.cache.files)) {
      if (path === '.') continue;
      const lastSlash = path.lastIndexOf('/');
      const parent = lastSlash === -1 ? '.' : path.slice(0, lastSlash);
      const bucket = map.get(parent);
      if (bucket) bucket.push({ path, entry });
      else map.set(parent, [{ path, entry }]);
    }
    this.childrenByParent = map;
  }
}