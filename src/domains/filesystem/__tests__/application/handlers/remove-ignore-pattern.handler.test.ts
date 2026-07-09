import { RemoveIgnorePatternHandler } from '../../../application/handlers/remove-ignore-pattern.handler';
import { RemoveIgnorePatternCommand } from '../../../application/commands/remove-ignore-pattern.command';
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

describe('RemoveIgnorePatternHandler', () => {
  let handler: RemoveIgnorePatternHandler;
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
    handler = new RemoveIgnorePatternHandler(configRepo);
  });

  it('should remove an existing ignore pattern', async () => {
    const config = createConfig('ws-1', ['*.log', '*.tmp', 'node_modules/']);
    await configRepo.save(config);

    const command = new RemoveIgnorePatternCommand('ws-1', '*.tmp');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);

    const updated = await configRepo.findByWorkspaceId(new WorkspaceId('ws-1'));
    expect(updated!.ignorePatterns).not.toContain('*.tmp');
    expect(updated!.ignorePatterns).toContain('*.log');
    expect(updated!.ignorePatterns).toContain('node_modules/');
  });

  it('should succeed when pattern does not exist', async () => {
    const config = createConfig('ws-1', ['*.log']);
    await configRepo.save(config);

    const command = new RemoveIgnorePatternCommand('ws-1', '*.tmp');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);

    const updated = await configRepo.findByWorkspaceId(new WorkspaceId('ws-1'));
    expect(updated!.ignorePatterns).toEqual(['*.log']);
  });

  it('should return error when config is not found', async () => {
    const command = new RemoveIgnorePatternCommand('ws-1', '*.log');
    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Project config not found');
  });
});