import { ICommand } from '../../../shared-kernel/application/command.interface';

export class DetectChangesCommand implements ICommand {
  constructor(public readonly filePath: string) {}
}