import { ICommand } from '../../../shared-kernel/application/command.interface';

export class MigrateLinksCommand implements ICommand {
  constructor(
    public readonly oldDocumentId: string,
    public readonly newDocumentIds: string[]
  ) {}
}