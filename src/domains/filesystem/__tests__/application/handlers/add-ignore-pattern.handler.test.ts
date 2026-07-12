import { AddIgnorePatternHandler } from '../../../application/handlers/add-ignore-pattern.handler';
import { AddIgnorePatternCommand } from '../../../application/commands/add-ignore-pattern.command';
import { IProjectConfigRepository } from '../../../../project/domain/repository/project-config-repository.interface';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { IFileSystemRepository } from '../../../../filesystem/domain/repository/filesystem-repository.interface';
import { FileNode } from '../../../../filesystem/domain/entities/file-node';
import { FolderNode } from '../../../../filesystem/domain/entities/folder-node';
import { EventBus } from '../../../../shared-kernel/events/event-bus';

// --- Mock: ProjectConfigRepository (already exists, kept intact) ---
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

// --- Mock: FileSystemRepository ---
class MockFileSystemRepository implements IFileSystemRepository {
  private nodes: Array<FileNode | FolderNode> = [];

  async findAll(): Promise<Array<FileNode | FolderNode>> {
    return this.nodes;
  }

  // Stub other methods as needed; they are not called in these tests
  async findByPath(): Promise<FileNode | FolderNode | null> { return null; }
  async findChildrenOf(): Promise<Array<FileNode | FolderNode>> { return []; }
  async findByPattern(): Promise<FileNode[]> { return []; }
  async delete(): Promise<void> {}
  async clear(): Promise<void> {}
}

describe('AddIgnorePatternHandler', () => {
  let handler: AddIgnorePatternHandler;
  let configRepo: MockProjectConfigRepository;
  let fileSystemRepo: MockFileSystemRepository;
  let eventBus: EventBus;

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
    fileSystemRepo = new MockFileSystemRepository();
    eventBus = EventBus.getInstance();   // use the real singleton, just mock emit indirectly if needed
    handler = new AddIgnorePatternHandler(configRepo, fileSystemRepo, eventBus);
  });

  afterEach(() => {
    eventBus.clear(); // clean up any registered handlers
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