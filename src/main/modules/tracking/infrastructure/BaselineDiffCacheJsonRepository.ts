import { createHash } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { ContentDiffDto } from '@shared/ipc/tracking';

interface CacheEntry {
  baseline: string | null;
  diff: ContentDiffDto | null;
}

const WORKSPACE_KEY_HEX_LENGTH = 32;
const FILE_KEY_HEX_LENGTH = 40;
const LEGACY_BASELINES_FILENAME = 'codeness-baselines.json';

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

  async hasBaseline(workspaceId: string, relativePath: string): Promise<boolean> {
    let path: string;
    try {
      path = this.filePath(workspaceId, relativePath);
    } catch {
      return false;
    }
    const entry = await this.readCacheFile(path);
    return entry !== null && entry.baseline !== null;
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

  /**
   * Lazily recovers a baseline from legacy stores.
   * Checked in priority order:
   * 1. codeness-baselines.json (userData root)
   * 2. code-nexus-cache/<64-hex>/<path>.json (old per-file cache)
   * 3. code-nexus-cache/<32-hex>/$(normalized).json (intermediate buggy format)
   */
  async loadLegacyBaseline(workspaceId: string, relativePath: string): Promise<string | null> {
    const normalized = relativePath.replace(/\\/g, '/');

    // 1. codeness-baselines.json
    const jsonIndex = await this.loadLegacyBaselineIndex(workspaceId);
    const fromJson = jsonIndex?.get(normalized);
    if (fromJson !== undefined) return fromJson;

    // 2. Old 64-hex cache format: code-nexus-cache/<64-hex-workspace>/<relative-path>.json
    const fullWorkspaceHash = createHash('sha256').update(workspaceId).digest('hex');
    const legacy64Path = join(this.userDataPath, 'code-nexus-cache', fullWorkspaceHash, `${normalized}.json`);
    try {
      const raw = await readFile(legacy64Path, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.baseline === 'string') return parsed.baseline;
    } catch {
      // ignore
    }

    // 3. Intermediate buggy format: code-nexus-cache/<32-hex-workspace>/$(normalized).json
    const workspaceKey32 = createHash('sha256').update(workspaceId).digest('hex').slice(0, WORKSPACE_KEY_HEX_LENGTH);
    const legacyTypoPath = join(this.userDataPath, 'code-nexus-cache', workspaceKey32, '$(normalized).json');
    try {
      const raw = await readFile(legacyTypoPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.baseline === 'string') return parsed.baseline;
    } catch {
      // ignore
    }

    return null;
  }

  async loadLegacyBaselineIndex(workspaceId: string): Promise<Map<string, string> | null> {
    const legacyPath = join(this.userDataPath, LEGACY_BASELINES_FILENAME);
    let raw: string;
    try {
      raw = await readFile(legacyPath, 'utf8');
    } catch {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const top = parsed as Record<string, unknown>;
    const workspaceEntry = this.resolveLegacyWorkspaceEntry(top, workspaceId);
    if (workspaceEntry === null) return null;

    const result = new Map<string, string>();
    for (const [relPath, content] of Object.entries(workspaceEntry)) {
      if (typeof content === 'string') {
        result.set(relPath.replace(/\\/g, '/'), content);
      }
    }
    return result;
  }

  private resolveLegacyWorkspaceEntry(
    top: Record<string, unknown>,
    workspaceId: string,
  ): Record<string, unknown> | null {
    const toRecord = (v: unknown): Record<string, unknown> | null =>
      v !== null && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null;

    const exact = toRecord(top[workspaceId]);
    if (exact) return exact;

    const fwd = workspaceId.replace(/\\/g, '/');
    const fwdExact = toRecord(top[fwd]);
    if (fwdExact) return fwdExact;

    const lower = fwd.toLowerCase();
    for (const key of Object.keys(top)) {
      if (key.replace(/\\/g, '/').toLowerCase() === lower) {
        return toRecord(top[key]);
      }
    }
    return null;
  }

  private async readCacheFile(path: string): Promise<CacheEntry | null> {
    try {
      return await this.files.readJson<CacheEntry>(path);
    } catch {
      return null;
    }
  }
}