import { rename, unlink, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { createServiceToken, type ServiceToken } from '../../kernel/service-container';
import type { Logger } from '../logger/logger';

/** Container token for the shared atomic file writer. */
export const AtomicJsonFileToken: ServiceToken<AtomicJsonFile> =
  createServiceToken<AtomicJsonFile>('AtomicJsonFile');

/**
 * Atomic JSON/text file writer with per-path write locking, EPERM retry for
 * Windows transient locks, and corrupted-file self-repair on read.
 * Ports the production-hardened semantics of the legacy JsonDatabase
 * (write-lock queue → temp file → rename, read retries + brace-matching
 * extraction of the first valid JSON object).
 */
export class AtomicJsonFile {
  private static readonly writeLocks = new Map<string, Promise<void>>();

  constructor(private readonly logger: Logger) {}

  async readText(filePath: string, retries = 3): Promise<string> {
    const { readFile } = await import('fs/promises');
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await readFile(filePath, 'utf-8');
      } catch (error) {
        if (attempt === retries) throw error;
        await delay(50 * attempt);
      }
    }
    throw new Error(`Unexpected: read retries exhausted for ${filePath}`);
  }

  async readJson<T>(filePath: string, retries = 3): Promise<T> {
    const content = await this.readText(filePath, retries);
    if (content.trim().length === 0) {
      throw new Error(`File is empty: ${filePath}`);
    }
    try {
      return JSON.parse(content) as T;
    } catch (parseError) {
      const repaired = extractFirstJsonObject(content);
      if (repaired !== null) {
        this.logger.warn('repaired corrupted json file', { filePath });
        await this.writeText(filePath, repaired);
        return JSON.parse(repaired) as T;
      }
      throw parseError;
    }
  }

  async writeText(filePath: string, text: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await this.queueWrite(filePath, () => this.atomicWrite(filePath, text));
  }

  async writeJson<T>(filePath: string, data: T): Promise<void> {
    await this.writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  private queueWrite(filePath: string, writeFn: () => Promise<void>): Promise<void> {
    const previous = AtomicJsonFile.writeLocks.get(filePath) ?? Promise.resolve();
    const current = (async () => {
      await previous;
      await writeFn();
    })();
    AtomicJsonFile.writeLocks.set(filePath, current);
    return current.finally(() => {
      if (AtomicJsonFile.writeLocks.get(filePath) === current) {
        AtomicJsonFile.writeLocks.delete(filePath);
      }
    });
  }

  private async atomicWrite(targetPath: string, data: string): Promise<void> {
    const tmpPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2)}`;
    await writeFile(tmpPath, data, 'utf-8');

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await rename(tmpPath, targetPath);
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EPERM' && attempt < 2) {
          await delay(100 * (attempt + 1));
          continue;
        }
        try {
          await unlink(tmpPath);
        } catch {
          // Temp file already gone — nothing to clean up.
        }
        if (attempt === 2) {
          // Last resort: direct write. Losing atomicity beats losing data.
          this.logger.warn('atomic rename failed, falling back to direct write', {
            targetPath,
            code,
          });
          await writeFile(targetPath, data, 'utf-8');
          return;
        }
        throw error;
      }
    }
  }
}

function extractFirstJsonObject(content: string): string | null {
  const start = content.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return content.substring(start, i + 1);
    }
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}