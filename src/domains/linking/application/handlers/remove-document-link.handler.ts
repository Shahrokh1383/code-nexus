import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { IDocumentLinkRepository } from '../../domain/repository/document-link-repository.interface';
import { DocumentLinkId } from '../../domain/value-objects/document-link-id';
import { RemoveDocumentLinkCommand } from '../commands/remove-document-link.command';
import { NotFoundException } from '../../../shared-kernel/exceptions/not-found-exception';

export class RemoveDocumentLinkHandler implements ICommandHandler<RemoveDocumentLinkCommand, void> {
  private readonly eventBus: EventBus;

  constructor(private readonly docLinkRepository: IDocumentLinkRepository) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: RemoveDocumentLinkCommand): Promise<Result<void, string>> {
    try {
      const linkId = new DocumentLinkId(command.linkId);
      const link = await this.docLinkRepository.findById(linkId);

      if (!link) throw new NotFoundException('DocumentToDocumentLink', command.linkId);

      link.break();
      await this.docLinkRepository.delete(linkId);

      for (const event of link.getDomainEvents()) {
        await this.eventBus.emit(event);
      }
      link.clearDomainEvents();

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove document link';
      return Result.fail(message);
    }
  }
}