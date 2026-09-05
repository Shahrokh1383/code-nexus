import * as fs from 'fs/promises';
import { ICacheFileSystem } from '../../../../src/domains/tracking/application/ports/cache-file-system.interface';

export class NodeCacheFileSystem implements ICacheFileSystem {
  async readTextFile(absolutePath: string): Promise<string> {
    return fs.readFile(absolutePath, 'utf-8');
  }

  async writeTextFile(absolutePath: string, content: string): Promise<void> {
    await fs.writeFile(absolutePath, content, 'utf-8');
  }

  async ensureDir(absolutePath: string): Promise<void> {
    await fs.mkdir(absolutePath, { recursive: true });
  }
}