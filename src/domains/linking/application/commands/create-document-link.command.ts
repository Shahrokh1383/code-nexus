import { ICommand } from '../../../shared-kernel/application/command.interface';

export class CreateDocumentLinkCommand implements ICommand {
  constructor(
    public readonly parentDocumentId: string,
    public readonly childDocumentId: string
  ) {}
}