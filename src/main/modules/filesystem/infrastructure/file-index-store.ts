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

/**
 * `.doclink/file-index.json` store — flat path-keyed index with an in-memory
 * cache and a 300 ms debounced write, exactly like the legacy repository.
 * `flush()` forces pending writes (session stop, ignore-pattern purge).
 */
export class FileIndexStore {
  private readonly DEBOUNCE_MS = 300;
  private cache: FileIndexFile | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

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
    const index = await this.read();
    const prefix = parentPath === '.' ? '' : `${parentPath}/`;
    const children: IndexedPath[] = [];

    for (const [path, entry] of Object.entries(index.files)) {
      if (prefix === '') {
        if (!path.includes('/') && path !== '.') {
          children.push({ path, entry });
        }
      } else if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
        children.push({ path, entry });
      }
    }
    return children;
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
      this.scheduleWrite();
    }
    return deletedPaths;
  }

  async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.cache) {
      await this.file.writeJson(this.filePath, this.cache);
    }
  }

  private async read(): Promise<FileIndexFile> {
    if (this.cache) {
      return this.cache;
    }
    try {
      this.cache = await this.file.readJson<FileIndexFile>(this.filePath);
    } catch {
      this.cache = emptyIndex();
    }
    return this.cache;
  }

  private scheduleWrite(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
    }
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      if (this.cache) {
        this.file
          .writeJson(this.filePath, this.cache as FileIndexFile)
          .catch((error: unknown) => {
            this.logger.error('file-index debounced write failed', {
              message: error instanceof Error ? error.message : String(error),
            });
          });
      }
    }, this.DEBOUNCE_MS);
  }
}