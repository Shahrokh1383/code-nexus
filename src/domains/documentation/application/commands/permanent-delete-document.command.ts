import { ICommand } from '../../../shared-kernel/application/command.interface';

export class PermanentDeleteDocumentCommand implements ICommand {
  constructor(public readonly documentId: string) {}
}