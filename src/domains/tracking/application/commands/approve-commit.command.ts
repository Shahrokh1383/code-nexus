import { ICommand } from '../../../shared-kernel/application/command.interface';

export class ApproveCommitCommand implements ICommand {
  constructor(public readonly documentId: string) {}
}