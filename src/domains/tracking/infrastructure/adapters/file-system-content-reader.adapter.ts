import { IFileContentReader } from '../../application/ports/file-content-reader.interface';
import { ReadFileContentHandler } from '../../../../filesystem/application/handlers/read-file-content.handler';

export class FileSystemContentReaderAdapter implements IFileContentReader {
  constructor(private readonly readFileContentHandler: ReadFileContentHandler) {}

  async readContent(relativePath: string): Promise<string> {
    const result = await this.readFileContentHandler.execute({ filePath: relativePath } as any);
    if (result.isFailure) {
      throw new Error(result.getError() || 'Failed to read file content');
    }
    return result.getValue();
  }
}