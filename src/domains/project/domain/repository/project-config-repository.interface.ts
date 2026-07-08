import { WorkspaceId } from '../value-objects/workspace-id';
import { ProjectConfig } from '../entities/project-config';

export interface IProjectConfigRepository {
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProjectConfig | null>;
  save(config: ProjectConfig): Promise<void>;
}