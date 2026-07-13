import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { LinkId } from '../../domain/value-objects/link-id';
import { RemoveLinkCommand } from '../commands/remove-link.command';
import { NotFoundException } from '../../../shared-kernel/exceptions/not-found-exception';

export class RemoveLinkHandler implements ICommandHandler<RemoveLinkCommand, void> {
  private readonly eventBus: EventBus;

  constructor(private readonly linkRepository: ILinkRepository) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: RemoveLinkCommand): Promise<Result<void, string>> {
    try {
      const linkId = new LinkId(command.linkId);
      const link = await this.linkRepository.findById(linkId);

      if (!link) {
        throw new NotFoundException('CodeToDocLink', command.linkId);
      }

      link.break();
      await this.linkRepository.delete(linkId);

      for (const event of link.getDomainEvents()) {
        await this.eventBus.emit(event);
      }
      link.clearDomainEvents();

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove link';
      return Result.fail(message);
    }
  }
}