import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { DocumentDeletedEvent } from '../../../../src/domains/documentation/domain/events/document-deleted';
import { LinkCreatedEvent } from '../../../../src/domains/linking/domain/events/link-created';
import { LinkBrokenEvent } from '../../../../src/domains/linking/domain/events/link-broken';
import { DocumentLinkCreatedEvent } from '../../../../src/domains/linking/domain/events/document-link-created';
import { DocumentLinkBrokenEvent } from '../../../../src/domains/linking/domain/events/document-link-broken';
import { DocumentLinkJsonRepository } from '../../../../src/domains/linking/infrastructure/repository/document-link-json.repository';
import { LinkJsonRepository } from '../../../../src/domains/linking/infrastructure/repository/link-json.repository';
import { JsonDatabase } from '../../../../src/infrastructure/persistence/json-database';
import { DocumentJsonRepository } from '../../../../src/domains/documentation/infrastructure/repository/document-json.repository';
import { GetDocumentChildrenHandler } from '../../../../src/domains/linking/application/handlers/get-document-children.handler';
import { GetDocumentChildrenQuery } from '../../../../src/domains/linking/application/queries/get-document-children.query';
import { MigrateLinksHandler } from '../../../../src/domains/linking/application/handlers/migrate-links.handler';
import { MigrateLinksCommand } from '../../../../src/domains/linking/application/commands/migrate-links.command';
import { LinkMigrationService } from '../../../../src/domains/linking/domain/services/link-migration.service';
import { DocumentId } from '../../../../src/domains/documentation/domain/value-objects/document-id';
import { getCurrentWorkspaceRoot } from './workspace-context';

async function recalculateAndSaveDocumentLinkCount(rootPath: string, documentId: string): Promise<void> {
  try {
    const db = new JsonDatabase(rootPath);
    const docRepo = new DocumentJsonRepository(db, rootPath); // FIX: Added rootPath
    const linkRepo = new LinkJsonRepository(rootPath);
    const docLinkRepo = new DocumentLinkJsonRepository(rootPath);

    const docId = new DocumentId(documentId);
    const doc = await docRepo.findById(docId);
    if (!doc) return;

    const codeLinks = await linkRepo.findByDocument(docId);
    const parentDocLinks = await docLinkRepo.findByParentDocument(docId);
    const childDocLinks = await docLinkRepo.findByChildDocument(docId);

    const totalCount = codeLinks.length + parentDocLinks.length + childDocLinks.length;

    if (doc.linkCount !== totalCount) {
      doc.updateLinkCount(totalCount);
      await docRepo.save(doc);
    }
  } catch (error) {
    console.error(`Failed to update document link count for ${documentId}`, error);
  }
}

class DocumentDeletedEventHandler implements IDomainEventHandler<DocumentDeletedEvent> {
  async handle(event: DocumentDeletedEvent): Promise<void> {
    const rootPath = getCurrentWorkspaceRoot();
    if (!rootPath) return;
    try {
      const docLinkRepo = new DocumentLinkJsonRepository(rootPath);
      const childrenHandler = new GetDocumentChildrenHandler(docLinkRepo);
      const childrenResult = await childrenHandler.execute(
        new GetDocumentChildrenQuery(event.documentId.value)
      );
      if (childrenResult.isFailure) return;
      const childrenDtos = childrenResult.getValue();
      if (!childrenDtos || childrenDtos.length === 0) return;
      const childrenIds = childrenDtos.map(dto => dto.childDocumentId);
      const linkRepo = new LinkJsonRepository(rootPath);
      const migrationService = new LinkMigrationService();
      const migrateHandler = new MigrateLinksHandler(linkRepo, migrationService);
      await migrateHandler.execute(
        new MigrateLinksCommand(event.documentId.value, childrenIds)
      );
    } catch (error) {
      console.error('Failed to migrate links after document deletion', error);
    }
  }
}

class LinkCreatedEventHandler implements IDomainEventHandler<LinkCreatedEvent> {
  async handle(event: LinkCreatedEvent): Promise<void> {
    const rootPath = getCurrentWorkspaceRoot();
    if (!rootPath) return;
    if (event.category === 'code') {
      await recalculateAndSaveDocumentLinkCount(rootPath, event.targetId);
    }
  }
}

class LinkBrokenEventHandler implements IDomainEventHandler<LinkBrokenEvent> {
  async handle(event: LinkBrokenEvent): Promise<void> {
    const rootPath = getCurrentWorkspaceRoot();
    if (!rootPath) return;
    if (event.category === 'code') {
      await recalculateAndSaveDocumentLinkCount(rootPath, event.targetId);
    }
  }
}

class DocumentLinkCreatedEventHandler implements IDomainEventHandler<DocumentLinkCreatedEvent> {
  async handle(event: DocumentLinkCreatedEvent): Promise<void> {
    const rootPath = getCurrentWorkspaceRoot();
    if (!rootPath) return;
    await recalculateAndSaveDocumentLinkCount(rootPath, event.parentDocumentId);
    await recalculateAndSaveDocumentLinkCount(rootPath, event.childDocumentId);
  }
}

class DocumentLinkBrokenEventHandler implements IDomainEventHandler<DocumentLinkBrokenEvent> {
  async handle(event: DocumentLinkBrokenEvent): Promise<void> {
    const rootPath = getCurrentWorkspaceRoot();
    if (!rootPath) return;
    await recalculateAndSaveDocumentLinkCount(rootPath, event.parentDocumentId);
    await recalculateAndSaveDocumentLinkCount(rootPath, event.childDocumentId);
  }
}

export function registerLinkingEventSubscribers(): void {
  const eventBus = EventBus.getInstance();
  eventBus.register('DocumentDeletedEvent', new DocumentDeletedEventHandler());
  eventBus.register('LinkCreatedEvent', new LinkCreatedEventHandler());
  eventBus.register('LinkBrokenEvent', new LinkBrokenEventHandler());
  eventBus.register('DocumentLinkCreatedEvent', new DocumentLinkCreatedEventHandler());
  eventBus.register('DocumentLinkBrokenEvent', new DocumentLinkBrokenEventHandler());
}