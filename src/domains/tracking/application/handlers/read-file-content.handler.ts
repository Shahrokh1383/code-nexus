import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { ReadFileContentQuery } from '../queries/read-file-content.query';
import { IFileSystemAdapter } from '../ports/file-system-adapter.interface';
import { FilePath } from '../../domain/value-objects/file-path';
import * as path from 'path';

export class ReadFileContentHandler implements IQueryHandler<ReadFileContentQuery, string> {
  constructor(
    private readonly fileSystemAdapter: IFileSystemAdapter,
    private readonly workspaceRoot: string
  ) {}

  async execute(query: ReadFileContentQuery): Promise<Result<string, string>> {
    try {
      const relativePath = new FilePath(query.filePath);
      const absolutePath = path.join(this.workspaceRoot, relativePath.value);
      const content = await this.fileSystemAdapter.readFile(absolutePath);
      return Result.ok(content);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to read file content');
    }
  }
}