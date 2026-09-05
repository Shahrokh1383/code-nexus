import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetFileDiffQuery } from '../queries/get-file-diff.query';
import { ContentDiffDto } from '../dto/content-diff.dto';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { IBaselineDiffCacheRepository } from '../../domain/repository/baseline-diff-cache-repository.interface';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';

export type FileDiffResult = ContentDiffDto | null | 'CACHE_MISSING';

export class GetFileDiffHandler implements IQueryHandler<GetFileDiffQuery, FileDiffResult> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly cacheRepo: IBaselineDiffCacheRepository
  ) {}

  async execute(query: GetFileDiffQuery): Promise<Result<FileDiffResult, string>> {
    try {
      const filePath = new TrackedFilePath(query.filePath);
      const hashEntry = await this.hashRepo.findHashByPath(filePath);
      if (!hashEntry || !hashEntry.isPending) {
        return Result.ok(null);
      }

      const diff = await this.cacheRepo.loadDiff(query.filePath);
      if (diff === null) {
        return Result.ok('CACHE_MISSING');
      }

      return Result.ok(diff);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get file diff';
      return Result.fail(message);
    }
  }
}