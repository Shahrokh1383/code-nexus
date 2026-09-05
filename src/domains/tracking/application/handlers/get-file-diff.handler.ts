import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetFileDiffQuery } from '../queries/get-file-diff.query';
import { ContentDiffDto } from '../dto/content-diff.dto';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';

export class GetFileDiffHandler implements IQueryHandler<GetFileDiffQuery, ContentDiffDto | null> {
  constructor(private readonly hashRepo: IHashRepository) {}

  async execute(query: GetFileDiffQuery): Promise<Result<ContentDiffDto | null, string>> {
    try {
      const diff = await this.hashRepo.findDiffByPath(new TrackedFilePath(query.filePath));
      return Result.ok(diff);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get file diff';
      return Result.fail(message);
    }
  }
}