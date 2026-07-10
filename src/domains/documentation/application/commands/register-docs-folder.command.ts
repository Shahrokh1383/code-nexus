import { ICommand } from '../../../shared-kernel/application/command.interface';

export class RegisterDocsFolderCommand implements ICommand {
  constructor(
    public readonly workspaceId: string,
    public readonly suggestedPath?: string
  ) {}
}