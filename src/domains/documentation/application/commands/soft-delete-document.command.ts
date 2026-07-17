import { ICommand } from '../../../shared-kernel/application/command.interface';

export class SoftDeleteDocumentCommand implements ICommand {
  constructor(public readonly documentId: string) {}
}