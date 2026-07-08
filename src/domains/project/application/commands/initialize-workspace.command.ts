import { ICommand } from '../../../shared-kernel/application/command.interface';

export class InitializeWorkspaceCommand implements ICommand {
  constructor(public readonly rootPath: string) {}
}