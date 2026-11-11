import { randomUUID } from 'crypto';
import type { IgnorePattern } from '../domain/ignore-pattern';
import type { FileIndexCache } from './file-index-cache';
import type { FileIndexEntry } from './file-index-types';
import type { FileIndexPersistence } from './file-index-persistence';

const YIELD_INTERVAL = 500;

export class FileIndexMutations {
  constructor(
    private readonly cache: FileIndexCache,
    private readonly persistence: FileIndexPersistence
  ) {}

  async upsertFile(path: string): Promise<boolean> {
    const index = await this.cache.read();
    const existing = index.files[path];
    if (existing && !existing.isDirectory) return false;
    const isNew = !existing;
    const entry: FileIndexEntry = {
      id: randomUUID(),
      hash: null,
      lastModified: new Date().toISOString(),
      isDirectory: false,
    };
    index.files[path] = entry;
    this.cache.patchChildCache(path, entry, isNew);
    this.persistence.markDirty();
    this.persistence.scheduleWrite();
    return true;
  }

  async upsertFolder(path: string): Promise<boolean> {
    const index = await this.cache.read();
    const existing = index.files[path];
    if (existing && existing.isDirectory) return false;
    const isNew = !existing;
    const entry: FileIndexEntry = {
      id: randomUUID(),
      hash: null,
      lastModified: new Date().toISOString(),
      isDirectory: true,
    };
    index.files[path] = entry;
    this.cache.patchChildCache(path, entry, isNew);
    this.persistence.markDirty();
    this.persistence.scheduleWrite();
    return true;
  }

  async deleteByPath(path: string): Promise<void> {
    const index = await this.cache.read();
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
      this.cache.invalidateChildrenCache();
      this.persistence.markDirty();
      this.persistence.scheduleWrite();
    }
  }

  async deleteBatch(paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return;
    const index = await this.cache.read();
    const direct = new Set(paths);
    let changed = false;
    for (const p of paths) {
      if (index.files[p]) {
        delete index.files[p];
        changed = true;
      }
    }
    let sinceYield = 0;
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
      sinceYield++;
      if (sinceYield >= YIELD_INTERVAL) {
        sinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
    if (changed) {
      this.cache.invalidateChildrenCache();
      this.persistence.markDirty();
      this.persistence.scheduleWrite();
    }
  }

  async deleteByPattern(pattern: IgnorePattern): Promise<string[]> {
    const index = await this.cache.read();
    const deletedPaths: string[] = [];
    for (const path of Object.keys(index.files)) {
      if (pattern.matches(path)) {
        deletedPaths.push(path);
        delete index.files[path];
      }
    }
    if (deletedPaths.length > 0) {
      this.cache.invalidateChildrenCache();
      this.persistence.markDirty();
      this.persistence.scheduleWrite();
    }
    return deletedPaths;
  }

  async bulkUpsert(
    entries: ReadonlyArray<{ path: string; isDirectory: boolean }>
  ): Promise<void> {
    if (entries.length === 0) return;
    const index = await this.cache.read();
    const now = new Date().toISOString();
    let changed = false;
    let sinceYield = 0;
    for (const { path, isDirectory } of entries) {
      const existing = index.files[path];
      if (existing && existing.isDirectory === isDirectory) continue;
      index.files[path] = {
        id: existing?.id ?? randomUUID(),
        hash: null,
        lastModified: now,
        isDirectory,
      };
      changed = true;
      sinceYield++;
      if (sinceYield >= YIELD_INTERVAL) {
        sinceYield = 0;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }
    if (changed) {
      this.cache.invalidateChildrenCache();
      this.persistence.markDirty();
    }
  }
}