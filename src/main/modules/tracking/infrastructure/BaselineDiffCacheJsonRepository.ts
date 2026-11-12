import { unlink } from 'fs/promises';
import { join } from 'path';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { ContentDiffDto } from '@shared/ipc/tracking';

interface CacheEntry {
  baseline: string | null;
  diff: ContentDiffDto | null;
}

export class BaselineDiffCacheJsonRepository {
  constructor(
    private readonly files: AtomicJsonFile,
    private readonly userDataPath: string,
  ) {}

  private filePath(workspaceId: string, relativePath: string): string {
    return join(this.userDataPath, 'code-nexus-cache', workspaceId, `${relativePath}.json`);
  }

  async saveBaseline(workspaceId: string, relativePath: string, content: string): Promise<void> {
    const path = this.filePath(workspaceId, relativePath);
    const existing = await this.readCacheFile(path);
    const entry: CacheEntry = { baseline: content, diff: existing?.diff ?? null };
    await this.files.writeJson(path, entry);
  }

  async loadBaseline(workspaceId: string, relativePath: string): Promise<string | null> {
    const entry = await this.readCacheFile(this.filePath(workspaceId, relativePath));
    return entry?.baseline ?? null;
  }

  async saveDiff(workspaceId: string, relativePath: string, diff: ContentDiffDto): Promise<void> {
    const path = this.filePath(workspaceId, relativePath);
    const existing = await this.readCacheFile(path);
    const entry: CacheEntry = { baseline: existing?.baseline ?? null, diff };
    await this.files.writeJson(path, entry);
  }

  async loadDiff(workspaceId: string, relativePath: string): Promise<ContentDiffDto | null> {
    const entry = await this.readCacheFile(this.filePath(workspaceId, relativePath));
    return entry?.diff ?? null;
  }

  async clearCacheForFile(workspaceId: string, relativePath: string): Promise<void> {
    await unlink(this.filePath(workspaceId, relativePath)).catch(() => {});
  }

  private async readCacheFile(path: string): Promise<CacheEntry | null> {
    try {
      return await this.files.readJson<CacheEntry>(path);
    } catch {
      return null;
    }
  }
}