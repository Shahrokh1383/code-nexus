import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { WorkspaceId } from '../../domain/value-objects/workspace-id';
import { WorkspacePath } from '../../domain/value-objects/workspace-path';
import { IWorkspaceRepository } from '../../domain/repository/workspace-repository.interface';
import { WorkspaceScopeChangedEvent } from '../../domain/events/workspace-scope-changed';
import { ChangeWorkspaceScopeCommand } from '../commands/change-workspace-scope.command';
import { promises as fs } from 'fs';

export class ChangeWorkspaceScopeHandler implements ICommandHandler<ChangeWorkspaceScopeCommand, void> {
  private readonly eventBus: EventBus;

  constructor(private readonly workspaceRepo: IWorkspaceRepository) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: ChangeWorkspaceScopeCommand): Promise<Result<void, string>> {
    try {
      await fs.access(command.newRootPath);

      const workspaceId = new WorkspaceId(command.workspaceId);
      const workspace = await this.workspaceRepo.findById(workspaceId);

      if (!workspace) {
        return Result.fail('Workspace not found');
      }

      const newPath = new WorkspacePath(command.newRootPath);
      const oldPath = workspace.rootPath.value;

      this.eventBus.emit(
        new WorkspaceScopeChangedEvent(workspaceId, oldPath, newPath.value)
      );

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change workspace scope';
      return Result.fail(message);
    }
  }
}