import { readFile } from 'fs/promises';
import { join } from 'path';

export class FileSystemContentReader {
  async readContent(rootPath: string, relativePath: string): Promise<string> {
    const raw = await readFile(join(rootPath, relativePath), 'utf-8');
    return raw.replace(/\r\n|\r/g, '\n');
  }
}