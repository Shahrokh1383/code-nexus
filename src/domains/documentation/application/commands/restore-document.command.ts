import { ICommand } from '../../../shared-kernel/application/command.interface';

export class RestoreDocumentCommand implements ICommand {
  constructor(public readonly documentId: string) {}
}