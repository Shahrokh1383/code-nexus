import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { IFileSystemRepository } from '../../domain/repository/filesystem-repository.interface';
import { IFileWatcherPort } from '../../application/ports/file-watcher.port';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { AddIgnorePatternCommand } from '../commands/add-ignore-pattern.command';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';
import { IgnorePatternsChangedEvent } from '../../domain/events/ignore-patterns-changed';
import { FileExcludedEvent } from '../../domain/events/file-excluded';
import { FilePath } from '../../domain/value-objects/file-path';

export class AddIgnorePatternHandler implements ICommandHandler<AddIgnorePatternCommand, void> {
  constructor(
    private readonly configRepo: IProjectConfigRepository,
    private readonly fileSystemRepo: IFileSystemRepository,
    private readonly fileWatcherPort: IFileWatcherPort,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: AddIgnorePatternCommand): Promise<Result<void, string>> {
    try {
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(command.workspaceId));
      if (!config) {
        return Result.fail(`Project config not found for workspace: ${command.workspaceId}`);
      }

      const validatedPattern = new IgnorePattern(command.pattern);
      config.addIgnorePattern(validatedPattern.pattern);
      await this.configRepo.save(config);

      // 1. High-performance bulk deletion from file-index.json
      const deletedPaths = await this.fileSystemRepo.deleteByPattern(validatedPattern);

      // 2. Emit events for tracking cleanup
      for (const path of deletedPaths) {
        await this.eventBus.emit(new FileExcludedEvent(undefined, new FilePath(path)));
      }

      // 3. Update Chokidar watcher to unwatch the newly ignored files
      const allPatterns = config.ignorePatterns.map(p => new IgnorePattern(p));
      await this.fileWatcherPort.updateIgnorePatterns(allPatterns);

      await this.eventBus.emit(new IgnorePatternsChangedEvent(new WorkspaceId(command.workspaceId)));

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add ignore pattern';
      return Result.fail(message);
    }
  }
}