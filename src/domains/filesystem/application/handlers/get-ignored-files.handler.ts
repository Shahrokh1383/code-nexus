import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { GetIgnoredFilesQuery } from '../queries/get-ignored-files.query';

export class GetIgnoredFilesHandler implements IQueryHandler<GetIgnoredFilesQuery, string[]> {
  constructor(private readonly configRepo: IProjectConfigRepository) {}

  async execute(query: GetIgnoredFilesQuery): Promise<Result<string[], string>> {
    try {
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(query.workspaceId));
      if (!config) {
        return Result.fail(`Project config not found for workspace: ${query.workspaceId}`);
      }

      return Result.ok(config.ignorePatterns);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get ignored files';
      return Result.fail(message);
    }
  }
}