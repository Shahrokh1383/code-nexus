import { ICommand } from '../../../shared-kernel/application/command.interface';

export class DeleteDocumentCommand implements ICommand {
  constructor(public readonly documentId: string) {}
}