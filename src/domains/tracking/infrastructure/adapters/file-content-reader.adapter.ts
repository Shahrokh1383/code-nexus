import { promises as fs } from 'fs';
import * as path from 'path';
import { IFileContentReader } from '../../application/ports/file-content-reader.interface';

export class FileContentReaderAdapter implements IFileContentReader {
  // Session-based cache to solve the "Old Content Paradox" without violating Constitution
  private static cache = new Map<string, string>();

  constructor(private readonly workspaceRoot: string) {}

  async readContent(filePath: string): Promise<string> {
    const absolutePath = path.join(this.workspaceRoot, filePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return raw.replace(/\r\n|\r/g, '\n');
  }

  async getPreviousContent(filePath: string): Promise<string | null> {
    return FileContentReaderAdapter.cache.get(filePath) || null;
  }

  updateCache(filePath: string, content: string): void {
    FileContentReaderAdapter.cache.set(filePath, content);
  }
}