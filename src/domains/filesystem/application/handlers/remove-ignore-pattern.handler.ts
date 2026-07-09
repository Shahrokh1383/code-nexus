import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { RemoveIgnorePatternCommand } from '../commands/remove-ignore-pattern.command';

export class RemoveIgnorePatternHandler implements ICommandHandler<RemoveIgnorePatternCommand, void> {
  constructor(private readonly configRepo: IProjectConfigRepository) {}

  async execute(command: RemoveIgnorePatternCommand): Promise<Result<void, string>> {
    try {
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(command.workspaceId));
      if (!config) {
        return Result.fail(`Project config not found for workspace: ${command.workspaceId}`);
      }

      config.removeIgnorePattern(command.pattern);
      await this.configRepo.save(config);

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove ignore pattern';
      return Result.fail(message);
    }
  }
}