import { promises as fs } from 'fs';
import * as path from 'path';
import { IFileContentReader } from '../../application/ports/file-content-reader.interface';

/**
 * Infrastructure adapter for reading file content.
 * Normalizes line endings to LF before returning.
 * This is the ONLY infrastructure file in Tracking that reads file content.
 */
export class FileContentReaderAdapter implements IFileContentReader {
  constructor(private readonly workspaceRoot: string) {}

  async readContent(filePath: string): Promise<string> {
    const absolutePath = path.join(this.workspaceRoot, filePath);
    const raw = await fs.readFile(absolutePath, 'utf-8');
    return raw.replace(/\r\n/g, '\n');
  }
}