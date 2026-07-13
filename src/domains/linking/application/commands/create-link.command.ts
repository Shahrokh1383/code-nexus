import { ICommand } from '../../../shared-kernel/application/command.interface';

export class CreateLinkCommand implements ICommand {
  constructor(
    public readonly codeFileId: string,
    public readonly documentId: string
  ) {}
}