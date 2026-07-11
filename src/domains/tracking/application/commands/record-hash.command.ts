import { ICommand } from '../../../shared-kernel/application/command.interface';

export class RecordHashCommand implements ICommand {
  constructor(
    public readonly filePath: string,
    public readonly content: string
  ) {}
}