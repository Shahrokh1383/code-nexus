import * as fs from 'fs/promises';
import * as path from 'path';
import { IFileContentReader } from '../../application/ports/file-content-reader.interface';

export class FileSystemContentReaderAdapter implements IFileContentReader {
  constructor(private readonly workspaceRoot: string) {}

  async readContent(relativePath: string): Promise<string> {
    const absolutePath = path.join(this.workspaceRoot, relativePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return raw.replace(/\r\n|\r/g, '\n');
  }
}