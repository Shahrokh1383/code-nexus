import { ICommand } from '../../../shared-kernel/application/command.interface';

export class ScanProjectCommand implements ICommand {
  constructor(public readonly workspaceId: string) {}
}