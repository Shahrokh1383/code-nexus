import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetFileDiffQuery } from '../queries/get-file-diff.query';
import { ContentDiffDto } from '../dto/content-diff.dto';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';

export class GetFileDiffHandler implements IQueryHandler<GetFileDiffQuery, ContentDiffDto | null> {
  constructor(private readonly repository: ITrackingRepository) {}

  async execute(query: GetFileDiffQuery): Promise<Result<ContentDiffDto | null, string>> {
    try {
      const diff = await this.repository.findDiffByPath(new FilePath(query.filePath));
      return Result.ok(diff);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get file diff';
      return Result.fail(message);
    }
  }
}