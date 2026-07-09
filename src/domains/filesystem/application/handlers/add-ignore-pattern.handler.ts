import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { AddIgnorePatternCommand } from '../commands/add-ignore-pattern.command';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';

export class AddIgnorePatternHandler implements ICommandHandler<AddIgnorePatternCommand, void> {
  constructor(private readonly configRepo: IProjectConfigRepository) {}

  async execute(command: AddIgnorePatternCommand): Promise<Result<void, string>> {
    try {
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(command.workspaceId));
      if (!config) {
        return Result.fail(`Project config not found for workspace: ${command.workspaceId}`);
      }

      const validatedPattern = new IgnorePattern(command.pattern);

      config.addIgnorePattern(validatedPattern.pattern);
      await this.configRepo.save(config);

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add ignore pattern';
      return Result.fail(message);
    }
  }
}