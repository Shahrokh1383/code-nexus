import { ICommand } from '../../../shared-kernel/application/command.interface';

export class RemoveDocumentLinkCommand implements ICommand {
  constructor(public readonly linkId: string) {}
}