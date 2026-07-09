import { AddIgnorePatternHandler } from '../../../../application/handlers/add-ignore-pattern.handler';
import { AddIgnorePatternCommand } from '../../../../application/commands/add-ignore-pattern.command';
import { IProjectConfigRepository } from '../../../../../project/domain/repository/project-config-repository.interface';
import { ProjectConfig } from '../../../../../project/domain/entities/project-config';
import { WorkspaceId } from '../../../../../project/domain/value-objects/workspace-id';
import { Maybe } from '../../../../../shared-kernel/types/maybe';

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

describe('AddIgnorePatternHandler', () => {
  let handler: AddIgnorePatternHandler;
  let configRepo: MockProjectConfigRepository;

  const createConfig = (workspaceId: string, patterns: string[] = []): ProjectConfig => {
    return new ProjectConfig(
      new WorkspaceId(workspaceId),
      Maybe.none<string>(),
      patterns,
      '1.0'
    );
  };

  beforeEach(() => {
    configRepo = new MockProjectConfigRepository();
    handler = new AddIgnorePatternHandler(configRepo);
  });

  it('should add a valid ignore pattern to config', async () => {
    const config = createConfig('ws-1', ['*.log']);
    await configRepo.save(config);

    const command = new AddIgnorePatternCommand('ws-1', '*.tmp');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);

    const updated = await configRepo.findByWorkspaceId(new WorkspaceId('ws-1'));
    expect(updated!.ignorePatterns).toContain('*.tmp');
    expect(updated!.ignorePatterns).toContain('*.log');
  });

  it('should not add duplicate patterns', async () => {
    const config = createConfig('ws-1', ['*.log']);
    await configRepo.save(config);

    const command = new AddIgnorePatternCommand('ws-1', '*.log');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);

    const updated = await configRepo.findByWorkspaceId(new WorkspaceId('ws-1'));
    expect(updated!.ignorePatterns.filter(p => p === '*.log')).toHaveLength(1);
  });

  it('should return error when config is not found', async () => {
    const command = new AddIgnorePatternCommand('ws-1', '*.tmp');
    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Project config not found');
  });

  it('should return error for invalid pattern', async () => {
    const config = createConfig('ws-1');
    await configRepo.save(config);

    const command = new AddIgnorePatternCommand('ws-1', '');
    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Ignore pattern cannot be empty');
  });
});