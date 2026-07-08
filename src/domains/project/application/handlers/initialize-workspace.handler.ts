import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { WorkspaceId } from '../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../domain/value-objects/workspace-path';
import { MetadataFolderName } from '../../domain/value-objects/metadata-folder-name';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { Workspace } from '../../domain/entities/workspace';
import { ProjectConfig } from '../../domain/entities/project-config';
import { WorkspaceInitializedEvent } from '../../domain/events/workspace-initialized';
import { IWorkspaceRepository } from '../../domain/repository/workspace-repository.interface';
import { IProjectConfigRepository } from '../../domain/repository/project-config-repository.interface';
import { InitializeWorkspaceCommand } from '../commands/initialize-workspace.command';
import { WorkspaceDto } from '../dto/workspace.dto';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../../infrastructure/persistence/database-schema';
import { promises as fs } from 'fs';

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  '.doclink/',
  '*.log',
];

const DOCIGNORE_CONTENT = DEFAULT_IGNORE_PATTERNS.join('\n') + '\n';

export class InitializeWorkspaceHandler implements ICommandHandler<InitializeWorkspaceCommand, WorkspaceDto> {
  private readonly eventBus: EventBus;

  constructor(
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly configRepo: IProjectConfigRepository
  ) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: InitializeWorkspaceCommand): Promise<Result<WorkspaceDto, string>> {
    try {
      const normalizedPath = PathUtils.normalize(command.rootPath);

      await fs.access(normalizedPath);

      const workspaceId = new WorkspaceId(UuidGenerator.generate());
      const workspacePath = new WorkspacePath(normalizedPath);
      const metadataFolder = new MetadataFolderName();
      const createdAt = DateTime.now();

      const workspace = new Workspace(
        workspaceId,
        workspacePath,
        metadataFolder,
        createdAt,
        Maybe.none<DateTime>()
      );

      const projectConfig = new ProjectConfig(
        workspaceId,
        Maybe.none<string>(),
        [...DEFAULT_IGNORE_PATTERNS],
        DATABASE_SCHEMA_VERSION
      );

      await this.workspaceRepo.save(workspace);
      await this.configRepo.save(projectConfig);

      this.eventBus.emit(new WorkspaceInitializedEvent(workspaceId, workspacePath));

      return Result.ok(this.mapToDto(workspace));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize workspace';
      return Result.fail(message);
    }
  }

  private mapToDto(workspace: Workspace): WorkspaceDto {
    const lastScan = workspace.lastScanAt.getOrNull();

    return {
      id: workspace.id.value,
      rootPath: workspace.rootPath.value,
      metadataFolderPath: workspace.metadataFolderPath.value,
      createdAt: workspace.createdAt.toISO(),
      lastScanAt: lastScan ? lastScan.toISO() : null,
    };
  }
}