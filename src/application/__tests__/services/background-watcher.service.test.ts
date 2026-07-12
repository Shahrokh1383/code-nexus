import { BackgroundWatcherService } from '../../services/background-watcher.service';
import { ChokidarAdapter } from '../../../domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { EventBus } from '../../../domains/shared-kernel/events/event-bus';
import { WorkspaceInitializedEvent } from '../../../domains/project/domain/events/workspace-initialized';
import { WorkspaceScopeChangedEvent } from '../../../domains/project/domain/events/workspace-scope-changed';
import { WorkspaceId } from '../../../domains/project/domain/value-objects/workspace-id';
import { WorkspacePath } from '../../../domains/project/domain/value-objects/workspace-path';
import { IProjectConfigRepository } from '../../../domains/project/domain/repository/project-config-repository.interface';
import { ProjectConfig } from '../../../domains/project/domain/entities/project-config';
import { Maybe } from '../../../domains/shared-kernel/types/maybe';

class MockChokidarAdapter {
  startWatching = jest.fn().mockReturnValue({ on: jest.fn(), close: jest.fn() });
  stopWatching = jest.fn();
}

class MockProjectConfigRepository implements IProjectConfigRepository {
  private configs = new Map<string, ProjectConfig>();

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<ProjectConfig | null> {
    return this.configs.get(workspaceId.value) ?? null;
  }

  async save(config: ProjectConfig): Promise<void> {
    this.configs.set(config.workspaceId.value, config);
  }

  seed(workspaceId: string, patterns: string[]): void {
    const config = new ProjectConfig(
      new WorkspaceId(workspaceId),
      Maybe.none<string>(),
      patterns,
      '1.0'
    );
    this.configs.set(workspaceId, config);
  }
}

describe('BackgroundWatcherService', () => {
  let service: BackgroundWatcherService;
  let configRepo: MockProjectConfigRepository;
  let chokidarAdapter: MockChokidarAdapter;
  let eventBus: EventBus;

  beforeEach(() => {
    configRepo = new MockProjectConfigRepository();
    chokidarAdapter = new MockChokidarAdapter();
    eventBus = EventBus.getInstance();
    eventBus.clear();

    service = new BackgroundWatcherService(configRepo, chokidarAdapter as unknown as ChokidarAdapter);
  });

  afterEach(() => {
    eventBus.clear();
    // No service.stop() – it doesn't exist
  });

  it('should start watching on WorkspaceInitializedEvent', async () => {
    configRepo.seed('ws-1', ['node_modules/', '*.log']);

    const event = new WorkspaceInitializedEvent(
      new WorkspaceId('ws-1'),
      new WorkspacePath('/home/user/project')
    );

    await eventBus.emit(event);

    expect(chokidarAdapter.stopWatching).toHaveBeenCalled();
    expect(chokidarAdapter.startWatching).toHaveBeenCalledWith(
      '/home/user/project',
      expect.arrayContaining([
        expect.objectContaining({ pattern: 'node_modules/' }),
        expect.objectContaining({ pattern: '*.log' }),
      ])
    );
  });

  it('should start watching on WorkspaceScopeChangedEvent', async () => {
    configRepo.seed('ws-1', ['dist/']);

    const event = new WorkspaceScopeChangedEvent(
      new WorkspaceId('ws-1'),
      new WorkspacePath('/old/path'),
      new WorkspacePath('/new/path')
    );

    await eventBus.emit(event);

    expect(chokidarAdapter.stopWatching).toHaveBeenCalled();
    expect(chokidarAdapter.startWatching).toHaveBeenCalledWith(
      '/new/path',
      expect.arrayContaining([expect.objectContaining({ pattern: 'dist/' })])
    );
  });

  it('should not start watching when config is missing', async () => {
    const event = new WorkspaceInitializedEvent(
      new WorkspaceId('ws-missing'),
      new WorkspacePath('/home/user/project')
    );

    await eventBus.emit(event);

    expect(chokidarAdapter.startWatching).not.toHaveBeenCalled();
  });
});