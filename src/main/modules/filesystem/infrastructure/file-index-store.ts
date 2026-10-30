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

  constructor(
    private readonly rootPath: string,
    private readonly file: AtomicJsonFile,
    private readonly logger: Logger
  ) {}

  private get filePath(): string {
    return PathUtils.join(this.rootPath, '.doclink', 'file-index.json');
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

  /** Insert a file entry if absent (ports the legacy saga upsertFileNode). */
  async upsertFile(path: string): Promise<boolean> {
    const index = await this.read();
    const existing = index.files[path];
    if (existing && !existing.isDirectory) {
      return false;
    }
    index.files[path] = {
      id: randomUUID(),
      hash: null,
      lastModified: new Date().toISOString(),
      isDirectory: false,
    };
    this.invalidateChildrenCache();
    this.dirty = true;
    this.scheduleWrite();
    return true;
  }

  /** Insert a folder entry if absent (ports the legacy saga upsertFolderNode). */
  async upsertFolder(path: string): Promise<boolean> {
    const index = await this.read();
    const existing = index.files[path];
    if (existing && existing.isDirectory) {
      return false;
    }
    index.files[path] = {
      id: randomUUID(),
      hash: null,
      lastModified: new Date().toISOString(),
      isDirectory: true,
    };
    this.invalidateChildrenCache();
    this.dirty = true;
    this.scheduleWrite();
    return true;
  }

  /** Delete the entry and every nested child to prevent ghost files. */
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

  /** Batch delete — one scan of the index for many paths (used by reconcile). */
  async deleteBatch(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }
    const index = await this.read();
    const direct = new Set(paths);
    const prefixes = paths.map((p) => `${p}/`);
    let changed = false;

    for (const entryPath of Object.keys(index.files)) {
      if (
        direct.has(entryPath) ||
        prefixes.some((prefix) => entryPath.startsWith(prefix))
      ) {
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
      await this.file.writeJson(this.filePath, this.cache);
    }
  }

  private async read(): Promise<FileIndexFile> {
    if (this.cache) {
      return this.cache;
    }
    try {
      this.cache = await this.file.readJson<FileIndexFile>(this.filePath);
      this.dirty = false;
    } catch {
      this.cache = emptyIndex();
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

  private invalidateChildrenCache(): void {
    this.childrenByParent = null;
  }

  private scheduleWrite(): void {
    if (this.writeTimer) {
      // A write is already queued; it will capture every pending mutation.
      // Avoid timer churn under high mutation volume (e.g. 10k upserts).
      return;
    }
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      if (this.cache && this.dirty) {
        this.file
          .writeJson(this.filePath, this.cache as FileIndexFile)
          .catch((error: unknown) => {
            this.dirty = false;
            this.logger.error('file-index debounced write failed', {
              message: error instanceof Error ? error.message : String(error),
            });
          });
      }
    }, this.DEBOUNCE_MS);
  }
}