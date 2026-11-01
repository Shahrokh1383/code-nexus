import { randomUUID } from 'crypto';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { PathUtils } from '../../../shared/utils/path-utils';
import type { Logger } from '../../../shared/logger/logger';
import type { IgnorePattern } from '../domain/ignore-pattern';

export interface FileIndexEntry {
  id: string;
  hash: string | null;
  lastModified: string;
  isDirectory: boolean;
}

interface FileIndexFile {
  version: string;
  lastScan: string | null;
  files: Record<string, FileIndexEntry>;
}

export interface IndexedPath {
  path: string;
  entry: FileIndexEntry;
}

function emptyIndex(): FileIndexFile {
  return { version: '1.0', lastScan: null, files: {} };
}

export class FileIndexStore {
  private readonly DEBOUNCE_MS = 300;
  private cache: FileIndexFile | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private childrenByParent: Map<string, IndexedPath[]> | null = null;
  private dirty = false;
  private fileExisted = false;

  constructor(
    private readonly rootPath: string,
    private readonly file: AtomicJsonFile,
    private readonly logger: Logger
  ) {}

  private get filePath(): string {
    return PathUtils.join(this.rootPath, '.doclink', 'file-index.json');
  }

  /**
   * Guarantees `file-index.json` exists on disk before any watcher work
   * begins — restores legacy behavior where the file was always present
   * after workspace open. No-op when the file already exists.
   */
  async ensureExists(): Promise<void> {
    await this.read();
    if (this.fileExisted) {
      return;
    }
    await this.writeIndex();
    this.logger.info('file-index initialized', { path: this.filePath });
  }

  /** Sets the ISO timestamp of the last completed scan (legacy parity). */
  setLastScan(iso: string): void {
    if (!this.cache) {
      return;
    }
    this.cache.lastScan = iso;
    this.dirty = true;
  }

  async findByPath(path: string): Promise<FileIndexEntry | null> {
    const index = await this.read();
    return index.files[path] ?? null;
  }

  async listEntries(): Promise<IndexedPath[]> {
    const index = await this.read();
    return Object.entries(index.files).map(([path, entry]) => ({ path, entry }));
  }

  async findChildrenOf(parentPath: string): Promise<IndexedPath[]> {
    await this.read();
    if (!this.childrenByParent) {
      this.rebuildChildrenCache();
    }
    return this.childrenByParent?.get(parentPath) ?? [];
  }

  async upsertFile(path: string): Promise<boolean> {
    const index = await this.read();
    const existing = index.files[path];
    if (existing && !existing.isDirectory) {
      return false;
    }
    const entry: FileIndexEntry = {
      id: randomUUID(),
      hash: null,
      lastModified: new Date().toISOString(),
      isDirectory: false,
    };
    index.files[path] = entry;
    this.patchChildCache(path, entry);
    this.dirty = true;
    this.scheduleWrite();
    return true;
  }

  async upsertFolder(path: string): Promise<boolean> {
    const index = await this.read();
    const existing = index.files[path];
    if (existing && existing.isDirectory) {
      return false;
    }
    const entry: FileIndexEntry = {
      id: randomUUID(),
      hash: null,
      lastModified: new Date().toISOString(),
      isDirectory: true,
    };
    index.files[path] = entry;
    this.patchChildCache(path, entry);
    this.dirty = true;
    this.scheduleWrite();
    return true;
  }

  async deleteByPath(path: string): Promise<void> {
    const index = await this.read();
    const prefix = `${path}/`;
    let changed = false;

    if (index.files[path]) {
      delete index.files[path];
      changed = true;
    }
    for (const entryPath of Object.keys(index.files)) {
      if (entryPath.startsWith(prefix)) {
        delete index.files[entryPath];
        changed = true;
      }
    }
    if (changed) {
      this.invalidateChildrenCache();
      this.dirty = true;
      this.scheduleWrite();
    }
  }

  /**
   * Batch delete — direct paths + descendants. O(N · depth) instead of the
   * previous O(N · M): each entry walks its own parent chain (bounded by
   * path depth ~5) rather than scanning every input prefix. On a 50k-entry
   * index with 30k deletions this is ~250k ops instead of ~1.5B — the
   * difference between a multi-second freeze and ~2 ms.
   */
  async deleteBatch(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }
    const index = await this.read();
    const direct = new Set(paths);
    let changed = false;

    for (const p of paths) {
      if (index.files[p]) {
        delete index.files[p];
        changed = true;
      }
    }

    for (const entryPath of Object.keys(index.files)) {
      let p = entryPath;
      let isDescendant = false;
      while (p.includes('/')) {
        p = p.slice(0, p.lastIndexOf('/'));
        if (direct.has(p)) {
          isDescendant = true;
          break;
        }
      }
      if (isDescendant) {
        delete index.files[entryPath];
        changed = true;
      }
    }

    if (changed) {
      this.invalidateChildrenCache();
      this.dirty = true;
      this.scheduleWrite();
    }
  }

  async deleteByPattern(pattern: IgnorePattern): Promise<string[]> {
    const index = await this.read();
    const deletedPaths: string[] = [];

    for (const path of Object.keys(index.files)) {
      if (pattern.matches(path)) {
        deletedPaths.push(path);
        delete index.files[path];
      }
    }
    if (deletedPaths.length > 0) {
      this.invalidateChildrenCache();
      this.dirty = true;
      this.scheduleWrite();
    }
    return deletedPaths;
  }

  async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.cache && this.dirty) {
      this.dirty = false;
      await this.writeIndex();
    }
  }

  private async writeIndex(): Promise<void> {
    if (!this.cache) {
      return;
    }
    try {
      await this.file.writeJson(this.filePath, this.cache);
      this.fileExisted = true;
      this.logger.debug('file-index written', {
        path: this.filePath,
        entries: Object.keys(this.cache.files).length,
        lastScan: this.cache.lastScan,
      });
    } catch (error) {
      this.logger.error('file-index write failed', {
        path: this.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async read(): Promise<FileIndexFile> {
    if (this.cache) {
      return this.cache;
    }
    try {
      this.cache = await this.file.readJson<FileIndexFile>(this.filePath);
      this.fileExisted = true;
      this.dirty = false;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'ENOENT') {
        this.logger.warn('file-index read failed, rebuilding', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
      this.cache = emptyIndex();
      this.fileExisted = false;
      this.dirty = false;
    }
    return this.cache;
  }

  private rebuildChildrenCache(): void {
    if (!this.cache) {
      this.childrenByParent = new Map();
      return;
    }
    const map = new Map<string, IndexedPath[]>();
    for (const [path, entry] of Object.entries(this.cache.files)) {
      if (path === '.') {
        continue;
      }
      const lastSlash = path.lastIndexOf('/');
      const parent = lastSlash === -1 ? '.' : path.slice(0, lastSlash);
      const bucket = map.get(parent);
      if (bucket) {
        bucket.push({ path, entry });
      } else {
        map.set(parent, [{ path, entry }]);
      }
    }
    this.childrenByParent = map;
  }

  private patchChildCache(path: string, entry: FileIndexEntry): void {
    if (!this.childrenByParent) {
      return;
    }
    const lastSlash = path.lastIndexOf('/');
    const parent = lastSlash === -1 ? '.' : path.slice(0, lastSlash);
    const bucket = this.childrenByParent.get(parent);
    const indexedPath: IndexedPath = { path, entry };
    if (bucket) {
      const existingIdx = bucket.findIndex((c) => c.path === path);
      if (existingIdx >= 0) {
        bucket[existingIdx] = indexedPath;
      } else {
        bucket.push(indexedPath);
      }
    } else {
      this.childrenByParent.set(parent, [indexedPath]);
    }
  }

  private invalidateChildrenCache(): void {
    this.childrenByParent = null;
  }

  private scheduleWrite(): void {
    if (this.writeTimer) {
      return;
    }
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      if (this.cache && this.dirty) {
        this.dirty = false;
        this.writeIndex().catch((error: unknown) => {
          this.logger.error('file-index debounced write failed', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }, this.DEBOUNCE_MS);
  }
}