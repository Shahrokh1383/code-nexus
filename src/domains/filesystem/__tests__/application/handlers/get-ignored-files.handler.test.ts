import { GetIgnoredFilesHandler } from '../../../application/handlers/get-ignored-files.handler';
import { GetIgnoredFilesQuery } from '../../../application/queries/get-ignored-files.query';
import { IProjectConfigRepository } from '../../../../project/domain/repository/project-config-repository.interface';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';
import { Maybe } from '../../../../shared-kernel/types/maybe';

class MockProjectConfigRepository implements IProjectConfigRepository {
  private configs: ProjectConfig[] = [];

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProjectConfig | null> {
    return this.configs.find(c => c.workspaceId.equals(workspaceId)) ?? null;
  }

  async save(config: ProjectConfig): Promise<void> {
    const idx = this.configs.findIndex(c => c.workspaceId.equals(config.workspaceId));
    if (idx >= 0) this.configs[idx] = config;
    else this.configs.push(config);
  }
}

describe('GetIgnoredFilesHandler', () => {
  let handler: GetIgnoredFilesHandler;
  let configRepo: MockProjectConfigRepository;

  const createConfig = (workspaceId: string, patterns: string[]): ProjectConfig => {
    return new ProjectConfig(
      new WorkspaceId(workspaceId),
      Maybe.none<string>(),
      patterns,
      '1.0'
    );
  };

  beforeEach(() => {
    configRepo = new MockProjectConfigRepository();
    handler = new GetIgnoredFilesHandler(configRepo);
  });

  it('should return ignore patterns for existing config', async () => {
    const config = createConfig('ws-1', ['*.log', 'node_modules/', 'dist/']);
    await configRepo.save(config);

    const query = new GetIgnoredFilesQuery('ws-1');
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(['*.log', 'node_modules/', 'dist/']);
  });

  it('should return empty array when no patterns exist', async () => {
    const config = createConfig('ws-1', []);
    await configRepo.save(config);

    const query = new GetIgnoredFilesQuery('ws-1');
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });

  it('should return error when config is not found', async () => {
    const query = new GetIgnoredFilesQuery('ws-1');
    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Project config not found');
  });
});