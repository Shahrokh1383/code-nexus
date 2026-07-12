import { EventBus } from '../../domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../domains/shared-kernel/events/domain-event-handler.interface';
import { DomainEvent } from '../../domains/shared-kernel/events/domain-event';
import { WorkspaceInitializedEvent } from '../../domains/project/domain/events/workspace-initialized';
import { WorkspaceScopeChangedEvent } from '../../domains/project/domain/events/workspace-scope-changed';
import { ChokidarAdapter } from '../../domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { IgnorePattern } from '../../domains/filesystem/domain/value-objects/ignore-pattern';
import { IProjectConfigRepository } from '../../domains/project/domain/repository/project-config-repository.interface';
import { WorkspaceId } from '../../domains/project/domain/value-objects/workspace-id';
import { FileContentReaderAdapter } from '../../domains/tracking/infrastructure/adapters/file-content-reader.adapter';

export class BackgroundWatcherService implements IDomainEventHandler<DomainEvent> {
  private readonly eventBus: EventBus;

  constructor(
    private readonly configRepo: IProjectConfigRepository,
    private readonly chokidarAdapter: ChokidarAdapter
  ) {
    this.eventBus = EventBus.getInstance();
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.eventBus.register('WorkspaceInitialized', this);
    this.eventBus.register('WorkspaceScopeChanged', this);
  }

  async handle(event: DomainEvent): Promise<void> {
    if (event instanceof WorkspaceInitializedEvent) {
      await this.startWatching(event.workspaceId, event.rootPath.value);
    } else if (event instanceof WorkspaceScopeChangedEvent) {
      await this.startWatching(event.workspaceId, event.newRootPath.value);
    }
  }

  private async startWatching(workspaceId: WorkspaceId, rootPath: string) : Promise<void> {
    this.chokidarAdapter.stopWatching();
    FileContentReaderAdapter.clearCache();

    const config = await this.configRepo.findByWorkspaceId(workspaceId);
    if (!config) {
      return;
    }

    const mandatoryIgnores = ['**/.doclink/**'];
    const allPatterns = [...mandatoryIgnores, ...config.ignorePatterns];
    const ignorePatterns = allPatterns.map((p) => new IgnorePattern(p));

    this.chokidarAdapter.startWatching(rootPath, ignorePatterns);
  }
}