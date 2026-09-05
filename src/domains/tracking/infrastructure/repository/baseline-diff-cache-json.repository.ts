import * as path from 'path';
import { IBaselineDiffCacheRepository } from '../../domain/repository/baseline-diff-cache-repository.interface';
import { ICacheFileSystem } from '../../application/ports/cache-file-system.interface';
import { ContentDiffDto } from '../../application/dto/content-diff.dto';

interface CacheEntry {
  baseline: string | null;
  diff: ContentDiffDto | null;
}

export class BaselineDiffCacheJsonRepository implements IBaselineDiffCacheRepository {
  private readonly cacheRoot: string;

  constructor(
    private readonly fileSystem: ICacheFileSystem,
    userDataPath: string,
    workspaceId: string
  ) {
    this.cacheRoot = path.join(userDataPath, 'code-nexus-cache', workspaceId);
  }

  private getFilePath(relativePath: string): string {
    return path.join(this.cacheRoot, `${relativePath}.json`);
  }

  private async readCacheFile(filePath: string): Promise<CacheEntry | null> {
    try {
      const raw = await this.fileSystem.readTextFile(filePath);
      return JSON.parse(raw) as CacheEntry;
    } catch {
      return null;
    }
  }

  private async writeCacheFile(filePath: string, entry: CacheEntry): Promise<void> {
    const dir = path.dirname(filePath);
    await this.fileSystem.ensureDir(dir);
    await this.fileSystem.writeTextFile(filePath, JSON.stringify(entry, null, 2));
  }

  async saveBaseline(relativePath: string, content: string): Promise<void> {
    const filePath = this.getFilePath(relativePath);
    const existing = await this.readCacheFile(filePath);
    const entry: CacheEntry = {
      baseline: content,
      diff: existing?.diff ?? null,
    };
    await this.writeCacheFile(filePath, entry);
  }

  async loadBaseline(relativePath: string): Promise<string | null> {
    const entry = await this.readCacheFile(this.getFilePath(relativePath));
    return entry?.baseline ?? null;
  }

  async saveDiff(relativePath: string, diff: ContentDiffDto): Promise<void> {
    const filePath = this.getFilePath(relativePath);
    const existing = await this.readCacheFile(filePath);
    const entry: CacheEntry = {
      baseline: existing?.baseline ?? null,
      diff,
    };
    await this.writeCacheFile(filePath, entry);
  }

  async loadDiff(relativePath: string): Promise<ContentDiffDto | null> {
    const entry = await this.readCacheFile(this.getFilePath(relativePath));
    return entry?.diff ?? null;
  }

  async clearCacheForFile(relativePath: string): Promise<void> {
    // Not implemented; optional for Phase 2
  }
}