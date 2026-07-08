import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../domain/value-objects/workspace-id';
import { IWorkspaceRepository } from '../../domain/repository/workspace-repository.interface';
import { GetWorkspaceQuery } from '../queries/get-workspace.query';
import { WorkspaceDto } from '../dto/workspace.dto';

export class GetWorkspaceHandler implements IQueryHandler<GetWorkspaceQuery, WorkspaceDto> {
  constructor(private readonly workspaceRepo: IWorkspaceRepository) {}

  async execute(query: GetWorkspaceQuery): Promise<Result<WorkspaceDto, string>> {
    try {
      const id = new WorkspaceId(query.workspaceId);
      const workspace = await this.workspaceRepo.findById(id);

      if (!workspace) {
        return Result.fail('Workspace not found');
      }

      const lastScan = workspace.lastScanAt.getOrNull();

      const dto: WorkspaceDto = {
        id: workspace.id.value,
        rootPath: workspace.rootPath.value,
        metadataFolderPath: workspace.metadataFolderPath.value,
        createdAt: workspace.createdAt.toISO(),
        lastScanAt: lastScan ? lastScan.toISO() : null,
      };

      return Result.ok(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve workspace';
      return Result.fail(message);
    }
  }
}