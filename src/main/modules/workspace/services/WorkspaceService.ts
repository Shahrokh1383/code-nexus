import type {
  RecentWorkspaceDto,
  WorkspaceDto,
} from '@shared/ipc/workspace';
import { DomainException } from '../../../shared/errors/domain-exception';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
import type { FileSystemServiceContract } from '../../filesystem/services/contracts/FileSystemServiceContract';
import type { WorkspaceServiceContract } from './contracts/WorkspaceServiceContract';
import { normalizeWorkspaceRoot } from '../domain/workspace';
import type { DoclinkFolder } from '../infrastructure/doclink-folder';
import type { WorkspaceStore } from '../infrastructure/workspace-store';
import type { ConfigStore, WorkspaceConfig } from '../infrastructure/config-store';
import type { RecentWorkspacesStore } from '../infrastructure/recent-workspaces-store';
import { DEFAULT_IGNORE_PATTERNS } from '../infrastructure/config-store';

function notFound(): DomainException {
  return new DomainException('WORKSPACE_NOT_FOUND', 'Workspace not found');
}

function configNotFound(workspaceId: string): DomainException {
  return new DomainException(
    'PROJECT_CONFIG_NOT_FOUND',
    `Project config not found for workspace: ${workspaceId}`
  );
}

/**
 * Workspace module service: owns workspace lifecycle, project config, and
 * recent workspaces. Session activation (watcher + file index) is delegated
 * to the file-system module through its public contract — the only legal
 * synchronous cross-module channel.
 */
export class WorkspaceService implements WorkspaceServiceContract {
  constructor(
    private readonly doclink: DoclinkFolder,
    private readonly workspaceStore: WorkspaceStore,
    private readonly configStore: ConfigStore,
    private readonly recentStore: RecentWorkspacesStore,
    private readonly eventBus: EventBus,
    private readonly logger: Logger,
    private readonly fileSystem: () => FileSystemServiceContract
  ) {}

  async initialize(rootPath: string): Promise<WorkspaceDto> {
    const normalized = normalizeWorkspaceRoot(rootPath);

    await this.doclink.ensureRootAccessible(normalized);
    await this.doclink.ensureDoclink(normalized);
    await this.doclink.writeDocignoreMarker(normalized);

    const config = (await this.configStore.load(normalized)) ?? this.defaultConfig(normalized);
    const now = new Date().toISOString();
    const workspace: WorkspaceDto = {
      id: normalized,
      rootPath: normalized,
      metadataFolderPath: '.doclink',
      createdAt: now,
      lastScanAt: null,
    };

    await this.workspaceStore.save(workspace);
    await this.configStore.save(normalized, config);
    await this.recentStore.addOrUpdate({
      id: workspace.id,
      rootPath: workspace.rootPath,
      lastOpened: now,
    });

    this.eventBus.emit('WorkspaceInitialized', {
      workspaceId: normalized,
      rootPath: normalized,
    });
    await this.fileSystem().activateSession(normalized, config.ignorePatterns);
    return workspace;
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceDto> {
    const normalized = normalizeWorkspaceRoot(workspaceId);
    const schema = await this.workspaceStore.find(normalized);
    if (!schema) {
      throw notFound();
    }
    const config = await this.configStore.load(normalized);
    await this.fileSystem().activateSession(
      normalized,
      config?.ignorePatterns ?? [...DEFAULT_IGNORE_PATTERNS]
    );
    return this.workspaceStore.toDto(schema);
  }

  async changeWorkspaceScope(workspaceId: string, newRootPath: string): Promise<void> {
    const oldRoot = normalizeWorkspaceRoot(workspaceId);
    const newRoot = normalizeWorkspaceRoot(newRootPath);

    const schema = await this.workspaceStore.find(oldRoot);
    if (!schema) {
      throw notFound();
    }

    this.eventBus.emit('WorkspaceScopeChanged', {
      workspaceId: oldRoot,
      oldRootPath: oldRoot,
      newRootPath: newRoot,
    });

    await this.fileSystem().deactivateSession();
    const config = await this.configStore.load(newRoot);
    await this.fileSystem().activateSession(
      newRoot,
      config?.ignorePatterns ?? [...DEFAULT_IGNORE_PATTERNS]
    );
    this.logger.info('workspace scope changed', { from: oldRoot, to: newRoot });
  }

  async closeWorkspace(workspaceId: string): Promise<void> {
    const normalized = normalizeWorkspaceRoot(workspaceId);
    await this.fileSystem().deactivateSession();
    this.eventBus.emit('WorkspaceClosed', { workspaceId: normalized });
  }

  async getRecentWorkspaces(): Promise<RecentWorkspaceDto[]> {
    return this.recentStore.getRecent();
  }

  async removeRecentWorkspace(workspaceId: string): Promise<void> {
    await this.recentStore.remove(workspaceId);
  }

  async getIgnorePatterns(workspaceId: string): Promise<string[]> {
    const normalized = normalizeWorkspaceRoot(workspaceId);
    const config = await this.configStore.load(normalized);
    return config?.ignorePatterns ?? [];
  }

  async addIgnorePattern(workspaceId: string, pattern: string): Promise<void> {
    const config = await this.loadConfigOrThrow(workspaceId);
    if (!config.ignorePatterns.includes(pattern)) {
      config.ignorePatterns = [...config.ignorePatterns, pattern];
      await this.configStore.save(config.workspaceId, config);
    }
  }

  async removeIgnorePattern(workspaceId: string, pattern: string): Promise<void> {
    const config = await this.loadConfigOrThrow(workspaceId);
    config.ignorePatterns = config.ignorePatterns.filter((p) => p !== pattern);
    await this.configStore.save(config.workspaceId, config);
  }

  private async loadConfigOrThrow(workspaceId: string): Promise<WorkspaceConfig> {
    const normalized = normalizeWorkspaceRoot(workspaceId);
    const config = await this.configStore.load(normalized);
    if (!config) {
      throw configNotFound(normalized);
    }
    return config;
  }

  private defaultConfig(normalizedRoot: string): WorkspaceConfig {
    return {
      workspaceId: normalizedRoot,
      docsFolderPath: null,
      ignorePatterns: [...DEFAULT_IGNORE_PATTERNS],
    };
  }
}