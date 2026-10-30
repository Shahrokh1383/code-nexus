import { existsSync } from 'fs';
import { access, readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Node fs probe used by session reconciliation to check whether indexed
 * paths still exist on disk. The only fs touch in the file-system module
 * outside the watcher and the atomic file writer.
 */

export interface FsDirEntry {
  name: string;
  isDirectory: boolean;
  lastModified: string;
}
export class NodeFsProbe {
  exists(absolutePath: string): boolean {
    return existsSync(absolutePath);
  }

  async existsAsync(absolutePath: string): Promise<boolean> {
    try {
      await access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async readDir(absolutePath: string): Promise<FsDirEntry[]> {
    const dirents = await readdir(absolutePath, { withFileTypes: true });
    const result: FsDirEntry[] = new Array(dirents.length);
    const CONCURRENCY = 32;

    for (let i = 0; i < dirents.length; i+= CONCURRENCY) {
      const chunk = dirents.slice(i, i + CONCURRENCY);
      const chunkResults  = await Promise.all(
        chunk.map(async (d): Promise<FsDirEntry> => {
          if (d.isDirectory()) {
            return {
              name: d.name,
              isDirectory: true,
              lastModified: new Date(0).toISOString(),
            };
          }
          try {
            const s = await stat(`${absolutePath}/${d.name}`);
            return { name: d.name, isDirectory: false, lastModified: s.mtime.toISOString() };
          } catch {
            return { name: d.name, isDirectory: false, lastModified: new Date(0).toISOString() };
          }
        })
      );
      for (let j = 0; j < chunkResults.length; j++) {
        result[i + j] = chunkResults[j];
      }
    }
    return result;
  }

  absolutePath(rootPath: string, relativePath: string): string {
    return join(rootPath, relativePath);
  }
}