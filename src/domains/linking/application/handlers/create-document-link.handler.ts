import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { IDocumentLinkRepository } from '../../domain/repository/document-link-repository.interface';
import { IDocumentRepository } from '../../../documentation/domain/repository/document-repository.interface';
import { DocumentLinkValidatorService } from '../../domain/services/document-link-validator.service';
import { DocumentToDocumentLink } from '../../domain/entities/document-to-document-link';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CreateDocumentLinkCommand } from '../commands/create-document-link.command';
import { NotFoundException } from '../../../shared-kernel/exceptions/not-found-exception';

export class CreateDocumentLinkHandler implements ICommandHandler<CreateDocumentLinkCommand, void> {
  private readonly eventBus: EventBus;

  constructor(
    private readonly docLinkRepository: IDocumentLinkRepository,
    private readonly documentRepository: IDocumentRepository,
    private readonly validator: DocumentLinkValidatorService
  ) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: CreateDocumentLinkCommand): Promise<Result<void, string>> {
    try {
      const parentId = new DocumentId(command.parentDocumentId);
      const childId = new DocumentId(command.childDocumentId);

      const parentDoc = await this.documentRepository.findById(parentId);
      if (!parentDoc) throw new NotFoundException('Document', command.parentDocumentId);

      const childDoc = await this.documentRepository.findById(childId);
      if (!childDoc) throw new NotFoundException('Document', command.childDocumentId);

      const existing = await this.docLinkRepository.findByParentAndChild(parentId, childId);
      if (existing) {
        return Result.fail('Document link already exists');
      }

      await this.validator.validateNoCycles(parentId, childId);

      const link = DocumentToDocumentLink.create(parentId, childId);
      await this.docLinkRepository.save(link);

      // Emit events. The Documentation/Notification context will listen to 
      // DocumentLinkCreatedEvent to clear the "Orphan" status of the child document.
      for (const event of link.getDomainEvents()) {
        await this.eventBus.emit(event);
      }
      link.clearDomainEvents();

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create document link';
      return Result.fail(message);
    }
  }
}