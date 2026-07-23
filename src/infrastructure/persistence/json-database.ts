import { PathUtils } from '../../domains/shared-kernel/utils/path-utils';
import { promises as fs } from 'fs';

export class JsonDatabase {
  private readonly doclinkPath: string;
  
  // Static map to track write locks per absolute file path across all instances
  private static writeLocks = new Map<string, Promise<void>>();

  constructor(workspaceRoot: string) {
    this.doclinkPath = PathUtils.join(workspaceRoot, '.doclink');
  }

  async ensureDoclinkExists(): Promise<void> {
    await fs.mkdir(this.doclinkPath, { recursive: true });
  }

  /**
   * Reads and parses a JSON file.
   * If the file is corrupted (trailing garbage), repairs it by extracting
   * the first valid JSON object and rewriting the file.
   */
  async read<T>(filename: string, retries = 3): Promise<T> {
    const filePath = PathUtils.join(this.doclinkPath, filename);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.trim().length === 0) {
          throw new Error('File is empty');
        }

        try {
          return JSON.parse(content) as T;
        } catch (parseError) {
          // Attempt to repair the file if it's corrupted with trailing data.
          const repaired = this.extractFirstJsonObject(content);
          if (repaired !== null) {
            // Overwrite the corrupted file with the cleaned JSON.
            await this.atomicWrite(filePath, repaired);
            return repaired as unknown as T;
          }
          // If repair fails, rethrow the original error.
          throw parseError;
        }
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }

    throw new Error('Unexpected: read retries exhausted');
  }

  /**
   * Writes JSON data atomically to avoid corruption from overlapping writes.
   */
  async write<T>(filename: string, data: T): Promise<void> {
    await this.ensureDoclinkExists();
    const filePath = PathUtils.join(this.doclinkPath, filename);
    const json = JSON.stringify(data, null, 2);
    await this.queueWrite(filePath, () => this.atomicWrite(filePath, json));
  }

  async writeTextFile(filename: string, content: string): Promise<void> {
    await this.ensureDoclinkExists();
    const filePath = PathUtils.join(this.doclinkPath, filename);
    await this.queueWrite(filePath, () => this.atomicWrite(filePath, content));
  }

  async readTextFile(filename: string): Promise<string> {
    const filePath = PathUtils.join(this.doclinkPath, filename);
    return fs.readFile(filePath, 'utf-8');
  }

  // ─────────────────────── Private Helpers ───────────────────────

  /**
   * Ensures writes to the same file are queued sequentially to prevent
   * race conditions where multiple IPC handlers write at the same time.
   */
  private async queueWrite(filePath: string, writeFn: () => Promise<void>): Promise<void> {
    const previousLock = JsonDatabase.writeLocks.get(filePath) || Promise.resolve();
    
    const currentWrite = (async () => {
      await previousLock; // Wait for the previous write to finish
      await writeFn();
    })();

    JsonDatabase.writeLocks.set(filePath, currentWrite);

    try {
      await currentWrite;
    } finally {
      // Clean up the lock if this was the last write in the queue
      if (JsonDatabase.writeLocks.get(filePath) === currentWrite) {
        JsonDatabase.writeLocks.delete(filePath);
      }
    }
  }

  /**
   * Writes data to a temporary file and renames it to the target path.
   * On Windows, rename may fail with EPERM if the target is transiently locked.
   * Retries several times with backoff, then falls back to a direct write as a last resort.
   */
  private async atomicWrite(targetPath: string, data: string): Promise<void> {
    // Added Math.random to ensure absolute uniqueness even across rapid sequential calls
    const tmpPath = `${targetPath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2)}`;
    await fs.writeFile(tmpPath, data, 'utf-8');

    // Try atomic rename up to 3 times with increasing delay.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await fs.rename(tmpPath, targetPath);
        return; // success
      } catch (error: unknown) {
        const errnoError = error as NodeJS.ErrnoException;
        if (errnoError.code === 'EPERM' && attempt < 2) {
          // Wait a bit – likely a transient Windows file lock.
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
          continue;
        }
        // On last attempt or non-EPERM error, clean up temp file and fall back.
        try { await fs.unlink(tmpPath); } catch { /* ignore */ }
        if (attempt === 2) {
          // Last resort: direct write (non-atomic but better than losing data).
          console.warn(
            `[JsonDatabase] Atomic rename failed for ${targetPath}, falling back to direct write.`
          );
          await fs.writeFile(targetPath, data, 'utf-8');
          return;
        }
        throw error;
      }
    }
  }

  /**
   * Given a string that may contain trailing garbage after a valid JSON object,
   * attempts to locate the first complete JSON object using brace matching
   * and returns that substring if successful, otherwise null.
   */
  private extractFirstJsonObject(content: string): string | null {
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
        if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return content.substring(start, i + 1);
        }
      }
    }
    return null;
  }
}