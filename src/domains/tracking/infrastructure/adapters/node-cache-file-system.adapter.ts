import * as fs from 'fs/promises';
import * as path from 'path';
import { ICacheFileSystem } from '../../application/ports/cache-file-system.interface';

export class NodeCacheFileSystemAdapter implements ICacheFileSystem {
  async readTextFile(absolutePath: string): Promise<string> {
    return fs.readFile(absolutePath, 'utf-8');
  }

  async writeTextFile(absolutePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf-8');
  }

  async ensureDir(absolutePath: string): Promise<void> {
    await fs.mkdir(absolutePath, { recursive: true });
  }
}