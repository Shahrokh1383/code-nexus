import { createHash } from 'crypto';
import { unlink } from 'fs/promises';
import { join } from 'path';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { ContentDiffDto } from '@shared/ipc/tracking';

interface CacheEntry {
  baseline: string | null;
  diff: ContentDiffDto | null;
}

const WORKSPACE_KEY_HEX_LENGTH = 32;
const FILE_KEY_HEX_LENGTH = 40;

export class BaselineDiffCacheJsonRepository {
  constructor(
    private readonly files: AtomicJsonFile,
    private readonly userDataPath: string,
  ) {}

  private workspaceCacheDir(workspaceId: string): string {
    const key = createHash('sha256')
      .update(workspaceId)
      .digest('hex')
      .slice(0, WORKSPACE_KEY_HEX_LENGTH);
    return join(this.userDataPath, 'code-nexus-cache', key);
  }

  private filePath(workspaceId: string, relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/');
    if (
      normalized.length === 0 ||
      normalized.startsWith('/') ||
      /(^|\/)\.\.(\/|$)/.test(normalized)
    ) {
      throw new Error(`Invalid cache relative path: ${relativePath}`);
    }
    const fileKey = createHash('sha256')
      .update(normalized)
      .digest('hex')
      .slice(0, FILE_KEY_HEX_LENGTH);
    return join(this.workspaceCacheDir(workspaceId), `${fileKey}.json`);
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
    let path: string;
    try {
      path = this.filePath(workspaceId, relativePath);
    } catch {
      return;
    }
    await unlink(path).catch(() => {});
  }

  private async readCacheFile(path: string): Promise<CacheEntry | null> {
    try {
      return await this.files.readJson<CacheEntry>(path);
    } catch {
      return null;
    }
  }
}