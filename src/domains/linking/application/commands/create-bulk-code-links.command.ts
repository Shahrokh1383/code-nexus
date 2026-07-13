import { ICommand } from '../../../shared-kernel/application/command.interface';

export class CreateBulkCodeLinksCommand implements ICommand {
  constructor(
    public readonly codeFileIds: string[],
    public readonly documentId: string
  ) {}
}