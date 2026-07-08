import { ICommand } from '../../../shared-kernel/application/command.interface';

export class ChangeWorkspaceScopeCommand implements ICommand {
  constructor(
    public readonly workspaceId: string,
    public readonly newRootPath: string
  ) {}
}