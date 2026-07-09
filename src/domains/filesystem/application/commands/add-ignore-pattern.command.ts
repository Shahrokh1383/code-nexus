import { ICommand } from '../../../shared-kernel/application/command.interface';

export class AddIgnorePatternCommand implements ICommand {
  constructor(
    public readonly workspaceId: string,
    public readonly pattern: string
  ) {}
}