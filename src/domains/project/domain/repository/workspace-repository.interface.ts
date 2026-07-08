import { IRepository } from '../../../shared-kernel/repository/repository.interface';
import { Workspace } from '../entities/workspace';
import { WorkspacePath } from '../value-objects/workspace-path';

export interface IWorkspaceRepository extends IRepository<Workspace> {
  findByPath(path: WorkspacePath): Promise<Workspace | null>;
}