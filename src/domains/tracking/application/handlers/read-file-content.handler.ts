import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { ReadFileContentQuery } from '../queries/read-file-content.query';
import { IFileContentReader } from '../ports/file-content-reader.interface';

export class ReadFileContentHandler implements IQueryHandler<ReadFileContentQuery, string> {
  constructor(private readonly fileContentReader: IFileContentReader) {}

  async execute(query: ReadFileContentQuery): Promise<Result<string, string>> {
    try {
      const content = await this.fileContentReader.readContent(query.filePath);
      return Result.ok(content);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to read file content');
    }
  }
}