import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { RemoveIgnorePatternCommand } from '../commands/remove-ignore-pattern.command';
import { IgnorePatternsChangedEvent } from '../../domain/events/ignore-patterns-changed';

export class RemoveIgnorePatternHandler implements ICommandHandler<RemoveIgnorePatternCommand, void> {
  constructor(
    private readonly configRepo: IProjectConfigRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: RemoveIgnorePatternCommand): Promise<Result<void, string>> {
    try {
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(command.workspaceId));
      if (!config) {
        return Result.fail(`Project config not found for workspace: ${command.workspaceId}`);
      }

      config.removeIgnorePattern(command.pattern);
      await this.configRepo.save(config);

      // Notify that ignore patterns changed so tracking can be cleaned up
      await this.eventBus.emit(new IgnorePatternsChangedEvent(new WorkspaceId(command.workspaceId)));

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove ignore pattern';
      return Result.fail(message);
    }
  }
}