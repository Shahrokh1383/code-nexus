import { ICommand } from '../../../shared-kernel/application/command.interface';

export class RemoveLinkCommand implements ICommand {
  constructor(public readonly linkId: string) {}
}