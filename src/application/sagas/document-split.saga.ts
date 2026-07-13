import { EventBus } from '../../domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../domains/shared-kernel/events/domain-event-handler.interface';
import { DocumentDeletedEvent } from '../../domains/documentation/domain/events/document-deleted';
import { OrphanDetectedEvent } from '../../domains/documentation/domain/events/orphan-detected';
import { GetDocumentChildrenQuery } from '../../domains/linking/application/queries/get-document-children.query';
import { GetDocumentChildrenHandler } from '../../domains/linking/application/handlers/get-document-children.handler';
import { MigrateLinksCommand } from '../../domains/linking/application/commands/migrate-links.command';
import { MigrateLinksHandler } from '../../domains/linking/application/handlers/migrate-links.handler';
import { IDocumentRepository } from '../../domains/documentation/domain/repository/document-repository.interface';
import { ILinkRepository } from '../../domains/linking/domain/repository/link-repository.interface';
import { DocumentId } from '../../domains/documentation/domain/value-objects/document-id';

/**
 * Cross-Domain Saga: Bridges Documentation, Linking, and Notification contexts.
 * Listens for DocumentDeletedEvent, migrates code links to child documents, 
 * and triggers orphan re-evaluation.
 */
export class DocumentSplitSaga {
  private readonly eventBus: EventBus;
  private readonly documentDeletedHandler: IDomainEventHandler<DocumentDeletedEvent>;

  constructor(
    private readonly getChildrenHandler: GetDocumentChildrenHandler,
    private readonly migrateLinksHandler: MigrateLinksHandler,
    private readonly documentRepository: IDocumentRepository,
    private readonly linkRepository: ILinkRepository
  ) {
    this.eventBus = EventBus.getInstance();
    
    this.documentDeletedHandler = {
      handle: async (event: DocumentDeletedEvent): Promise<void> => {
        await this.onDocumentDeleted(event);
      },
    };
  }

  register(): void {
    this.eventBus.register('DocumentDeletedEvent', this.documentDeletedHandler);
  }

  unregister(): void {
    this.eventBus.unregister('DocumentDeletedEvent', this.documentDeletedHandler);
  }

  private async onDocumentDeleted(event: DocumentDeletedEvent): Promise<void> {
    const deletedDocId = event.documentId.value;

    // 1. Query children of the deleted document
    const childrenResult = await this.getChildrenHandler.execute(
        new GetDocumentChildrenQuery(deletedDocId)
    );

    if (childrenResult.isFailure) return;

    const childIds = childrenResult.getValue() ?? [];
    if (childIds.length === 0) return;

    // 2. Migrate code links from deleted parent to all children
    const migrateResult = await this.migrateLinksHandler.execute(
        new MigrateLinksCommand(deletedDocId, childIds)
    );

    if (migrateResult.isFailure) return;

    // 3. Check each child for orphan status
    for (const childId of childIds) {
        const childDocId = new DocumentId(childId);
        const childDoc = await this.documentRepository.findById(childDocId);

        if (childDoc) {
            const codeLinks = await this.linkRepository.findByDocument(childDocId);

            if (codeLinks.length === 0) {
                await this.eventBus.emit(new OrphanDetectedEvent(childDoc.id, childDoc.path));
            }
        }
    }

  }
}