import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { IFileSystemRepository } from '../../domain/repository/filesystem-repository.interface';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { AddIgnorePatternCommand } from '../commands/add-ignore-pattern.command';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';
import { FileExcludedEvent } from '../../domain/events/file-excluded';
import { FileNode } from '../../domain/entities/file-node';

export class AddIgnorePatternHandler implements ICommandHandler<AddIgnorePatternCommand, void> {
  constructor(
    private readonly configRepo: IProjectConfigRepository,
    private readonly fileSystemRepo: IFileSystemRepository,
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

      // Purge matching entries from file-index and notify tracking
      const allNodes = await this.fileSystemRepo.findAll();
      for (const node of allNodes) {
        if (validatedPattern.matches(node.path.value)) {
          await this.fileSystemRepo.delete(node.id);
          if (node instanceof FileNode) {
            // Only files need tracking cleanup; folders are structural
            await this.eventBus.emit(new FileExcludedEvent(node.id, node.path));
          }
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add ignore pattern';
      return Result.fail(message);
    }
  }
}