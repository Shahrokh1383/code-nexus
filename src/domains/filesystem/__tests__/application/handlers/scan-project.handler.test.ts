import { ScanProjectHandler } from '../../../application/handlers/scan-project.handler';
import { ScanProjectCommand } from '../../../application/commands/scan-project.command';
import { IFileSystemAdapter } from '../../../application/ports/file-system-adapter.interface';
import { IFileSystemRepository } from '../../../domain/repository/filesystem-repository.interface';
import { IWorkspaceRepository } from '../../../../project/domain/repository/workspace-repository.interface';
import { IProjectConfigRepository } from '../../../../project/domain/repository/project-config-repository.interface';
import { Workspace } from '../../../../project/domain/entities/workspace';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';
import { WorkspacePath } from '../../../../project/domain/value-objects/workspace-path';
import { MetadataFolderName } from '../../../../project/domain/value-objects/metadata-folder-name';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';
import { FileNode } from '../../../domain/entities/file-node';
import { FolderNode } from '../../../domain/entities/folder-node';
import { FilePath } from '../../../domain/value-objects/file-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { ScanCompletedEvent } from '../../../domain/events/scan-completed';
import { FileDiscoveredEvent } from '../../../domain/events/file-discovered';
import { Identifier } from '../../../../shared-kernel/types/identifier';

class MockWorkspaceRepository implements IWorkspaceRepository {
  private workspaces: Workspace[] = [];

  async findById(id: Identifier): Promise<Workspace | null> {
    return this.workspaces.find(w => w.id.equals(id)) ?? null;
  }

  async findByPath(): Promise<Workspace | null> {
    return null;
  }

  async save(workspace: Workspace): Promise<void> {
    const idx = this.workspaces.findIndex(w => w.id.equals(workspace.id));
    if (idx >= 0) this.workspaces[idx] = workspace;
    else this.workspaces.push(workspace);
  }

  async delete(): Promise<void> {}
  async exists(): Promise<boolean> { return false; }
}

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

class MockFileSystemRepository implements IFileSystemRepository {
  private nodes = new Map<string, FileNode | FolderNode>();

  async findById(id: Identifier): Promise<FileNode | FolderNode | null> {
    return this.nodes.get(id.value) ?? null;
  }

  async findByPath(path: FilePath): Promise<FileNode | FolderNode | null> {
    for (const node of this.nodes.values()) {
      if (node.path.equals(path)) return node;
    }
    return null;
  }

  async save(node: FileNode | FolderNode): Promise<void> {
    this.nodes.set(node.id.value, node);
  }

  async delete(id: Identifier): Promise<void> {
    this.nodes.delete(id.value);
  }

  async exists(id: Identifier): Promise<boolean> {
    return this.nodes.has(id.value);
  }

  async findAll(): Promise<Array<FileNode | FolderNode>> {
    return Array.from(this.nodes.values());
  }

  async findChildrenOf(parentPath: FilePath): Promise<Array<FileNode | FolderNode>> {
    const children: Array<FileNode | FolderNode> = [];
    for (const node of this.nodes.values()) {
      if (node instanceof FileNode) {
        if (node.parentPath.equals(parentPath)) children.push(node);
      } else {
        if (node.path.getParentPath().equals(parentPath)) children.push(node);
      }
    }
    return children;
  }

  async findByPattern(pattern: string): Promise<FileNode[]> {
    const result: FileNode[] = [];
    for (const node of this.nodes.values()) {
      if (node instanceof FileNode && node.path.value.includes(pattern)) {
        result.push(node);
      }
    }
    return result;
  }
}

describe('ScanProjectHandler', () => {
  let handler: ScanProjectHandler;
  let workspaceRepo: MockWorkspaceRepository;
  let configRepo: MockProjectConfigRepository;
  let fileSystemRepo: MockFileSystemRepository;
  let mockAdapter: IFileSystemAdapter;
  let eventBus: EventBus;

  const createWorkspace = (id: string): Workspace => {
    return new Workspace(
      new WorkspaceId(id),
      new WorkspacePath('/home/user/project'),
      new MetadataFolderName(),
      DateTime.now(),
      Maybe.none<DateTime>()
    );
  };

  const createConfig = (workspaceId: string, patterns: string[] = []): ProjectConfig => {
    return new ProjectConfig(
      new WorkspaceId(workspaceId),
      Maybe.none<string>(),
      patterns,
      '1.0'
    );
  };

  beforeEach(() => {
    workspaceRepo = new MockWorkspaceRepository();
    configRepo = new MockProjectConfigRepository();
    fileSystemRepo = new MockFileSystemRepository();
    mockAdapter = { scanDirectory: jest.fn().mockResolvedValue([]) };
    eventBus = EventBus.getInstance();
    eventBus.clear();

    handler = new ScanProjectHandler(workspaceRepo, configRepo, fileSystemRepo, mockAdapter);
  });

  afterEach(() => {
    eventBus.clear();
  });

  it('should return error when workspace is not found', async () => {
    const command = new ScanProjectCommand('missing-workspace');
    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Workspace not found');
  });

  it('should return error when project config is not found', async () => {
    const workspace = createWorkspace('ws-1');
    await workspaceRepo.save(workspace);

    const command = new ScanProjectCommand('ws-1');
    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Project config not found');
  });

  it('should scan empty directory and return empty tree', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1');
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    (mockAdapter.scanDirectory as jest.Mock).mockResolvedValue([]);

    const command = new ScanProjectCommand('ws-1');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.totalFiles).toBe(0);
    expect(dto.totalFolders).toBe(1);
    expect(dto.root.children).toHaveLength(0);
  });

  it('should discover files and build tree DTO', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1');
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    (mockAdapter.scanDirectory as jest.Mock).mockResolvedValue([
      { path: 'readme.md', name: 'readme.md', size: 100, lastModified: new Date('2024-01-01'), isDirectory: false },
      { path: 'src', name: 'src', size: 0, lastModified: new Date('2024-01-01'), isDirectory: true },
      { path: 'src/index.ts', name: 'index.ts', size: 200, lastModified: new Date('2024-01-01'), isDirectory: false },
    ]);

    const command = new ScanProjectCommand('ws-1');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.totalFiles).toBe(2);
    expect(dto.totalFolders).toBe(2); // root + src
    expect(dto.root.children).toHaveLength(2);
  });

  it('should apply ignore patterns from config', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1', ['*.log']);
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    (mockAdapter.scanDirectory as jest.Mock).mockResolvedValue([
      { path: 'app.ts', name: 'app.ts', size: 100, lastModified: new Date('2024-01-01'), isDirectory: false },
      { path: 'debug.log', name: 'debug.log', size: 50, lastModified: new Date('2024-01-01'), isDirectory: false },
    ]);

    const command = new ScanProjectCommand('ws-1');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.totalFiles).toBe(1);
    expect(dto.root.children).toHaveLength(1);
    expect(dto.root.children[0].name).toBe('app.ts');
  });

  it('should skip invalid ignore patterns silently', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1', ['*.ts', '']);
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    (mockAdapter.scanDirectory as jest.Mock).mockResolvedValue([
      { path: 'app.ts', name: 'app.ts', size: 100, lastModified: new Date('2024-01-01'), isDirectory: false },
      { path: 'readme.md', name: 'readme.md', size: 50, lastModified: new Date('2024-01-01'), isDirectory: false },
    ]);

    const command = new ScanProjectCommand('ws-1');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.totalFiles).toBe(1); // only readme.md
  });

  it('should save all discovered nodes to repository', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1');
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    (mockAdapter.scanDirectory as jest.Mock).mockResolvedValue([
      { path: 'file1.ts', name: 'file1.ts', size: 100, lastModified: new Date('2024-01-01'), isDirectory: false },
      { path: 'file2.ts', name: 'file2.ts', size: 200, lastModified: new Date('2024-01-01'), isDirectory: false },
    ]);

    const command = new ScanProjectCommand('ws-1');
    await handler.execute(command);

    const allNodes = await fileSystemRepo.findAll();
    expect(allNodes.length).toBe(3); // root + 2 files
  });

  it('should emit FileDiscoveredEvent and ScanCompletedEvent', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1');
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    const emitSpy = jest.spyOn(eventBus, 'emit');

    (mockAdapter.scanDirectory as jest.Mock).mockResolvedValue([
      { path: 'main.ts', name: 'main.ts', size: 100, lastModified: new Date('2024-01-01'), isDirectory: false },
    ]);

    const command = new ScanProjectCommand('ws-1');
    await handler.execute(command);

    const discoveredEvents = emitSpy.mock.calls.filter(
      ([event]) => event instanceof FileDiscoveredEvent
    );
    const completedEvents = emitSpy.mock.calls.filter(
      ([event]) => event instanceof ScanCompletedEvent
    );

    expect(discoveredEvents).toHaveLength(1);
    expect(completedEvents).toHaveLength(1);

    const scanCompleted = completedEvents[0][0] as ScanCompletedEvent;
    expect(scanCompleted.workspaceId).toBe('.');
    expect(scanCompleted.fileCount).toBe(1);
    expect(scanCompleted.folderCount).toBe(1);

    emitSpy.mockRestore();
  });

  it('should return error when adapter throws', async () => {
    const workspace = createWorkspace('ws-1');
    const config = createConfig('ws-1');
    await workspaceRepo.save(workspace);
    await configRepo.save(config);

    (mockAdapter.scanDirectory as jest.Mock).mockRejectedValue(new Error('Disk read error'));

    const command = new ScanProjectCommand('ws-1');
    const result = await handler.execute(command);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Disk read error');
  });
});