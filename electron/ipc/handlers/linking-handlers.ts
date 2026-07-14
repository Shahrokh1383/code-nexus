import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { JsonDatabase } from '../../../src/infrastructure/persistence/json-database';
import { LinkJsonRepository } from '../../../src/domains/linking/infrastructure/repository/link-json.repository';
import { DocumentLinkJsonRepository } from '../../../src/domains/linking/infrastructure/repository/document-link-json.repository';
import { DocumentJsonRepository } from '../../../src/domains/documentation/infrastructure/repository/document-json.repository';
import { DocumentLinkValidatorService } from '../../../src/domains/linking/domain/services/document-link-validator.service';
import { LinkMigrationService } from '../../../src/domains/linking/domain/services/link-migration.service';
import { ICodeFileQueryPort } from '../../../src/domains/linking/application/ports/code-file-query.port';
import { CodeFileSummaryDto } from '../../../src/domains/linking/application/dto/link.dto';
import { DocumentId } from '../../../src/domains/documentation/domain/value-objects/document-id';

// Commands & Handlers
import { CreateLinkCommand } from '../../../src/domains/linking/application/commands/create-link.command';
import { CreateLinkHandler } from '../../../src/domains/linking/application/handlers/create-link.handler';
import { RemoveLinkCommand } from '../../../src/domains/linking/application/commands/remove-link.command';
import { RemoveLinkHandler } from '../../../src/domains/linking/application/handlers/remove-link.handler';
import { CreateDocumentLinkCommand } from '../../../src/domains/linking/application/commands/create-document-link.command';
import { CreateDocumentLinkHandler } from '../../../src/domains/linking/application/handlers/create-document-link.handler';
import { RemoveDocumentLinkCommand } from '../../../src/domains/linking/application/commands/remove-document-link.command';
import { RemoveDocumentLinkHandler } from '../../../src/domains/linking/application/handlers/remove-document-link.handler';
import { MigrateLinksCommand } from '../../../src/domains/linking/application/commands/migrate-links.command';
import { MigrateLinksHandler } from '../../../src/domains/linking/application/handlers/migrate-links.handler';
import { CreateBulkCodeLinksCommand } from '../../../src/domains/linking/application/commands/create-bulk-code-links.command';
import { CreateBulkCodeLinksHandler, BulkCreateResult } from '../../../src/domains/linking/application/handlers/create-bulk-code-links.handler';

// Queries & Handlers
import { GetLinksForDocumentQuery } from '../../../src/domains/linking/application/queries/get-links-for-document.query';
import { GetLinksForDocumentHandler } from '../../../src/domains/linking/application/handlers/get-links-for-document.handler';
import { GetLinksForCodeFileQuery } from '../../../src/domains/linking/application/queries/get-links-for-codefile.query';
import { GetLinksForCodeFileHandler } from '../../../src/domains/linking/application/handlers/get-links-for-codefile.handler';
import { GetUnlinkedCodefilesQuery } from '../../../src/domains/linking/application/queries/get-unlinked-codefiles.query';
import { GetUnlinkedCodefilesHandler } from '../../../src/domains/linking/application/handlers/get-unlinked-codefiles.handler';
import { GetDocumentChildrenQuery } from '../../../src/domains/linking/application/queries/get-document-children.query';
import { GetDocumentChildrenHandler } from '../../../src/domains/linking/application/handlers/get-document-children.handler';
import { GetDocumentParentsQuery } from '../../../src/domains/linking/application/queries/get-document-parents.query';
import { GetDocumentParentsHandler } from '../../../src/domains/linking/application/handlers/get-document-parents.handler';

import { IDomainEventHandler } from '../../../src/domains/shared-kernel/events/domain-event-handler.interface';
import { EventBus } from '../../../src/domains/shared-kernel/events/event-bus';
import { DocumentDeletedEvent } from '../../../src/domains/documentation/domain/events/document-deleted';

// Linking Domain Events
import { LinkCreatedEvent } from '../../../src/domains/linking/domain/events/link-created';
import { LinkBrokenEvent } from '../../../src/domains/linking/domain/events/link-broken';
import { DocumentLinkCreatedEvent } from '../../../src/domains/linking/domain/events/document-link-created';
import { DocumentLinkBrokenEvent } from '../../../src/domains/linking/domain/events/document-link-broken';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Anti‑Corruption Layer (ACL) Adapter.
 * Allows the Linking context to query FileSystem data without importing FileSystem domain classes directly.
 */
class FilesystemCodeFileQueryAdapter implements ICodeFileQueryPort {
  constructor(private readonly db: JsonDatabase) {}

  async getAllCodeFiles(): Promise<CodeFileSummaryDto[]> {
    try {
      const index = await this.db.read<any>('file-index.json');
      return Object.entries(index.files || {})
        .filter(([_, entry]: [string, any]) => !entry.isDirectory)
        .map(([path, entry]: [string, any]) => ({
          id: entry.id,
          name: path.split('/').pop() || path,
          path: path
        }));
    } catch {
      return [];
    }
  }

  async getCodeFileById(id: string): Promise<CodeFileSummaryDto | null> {
    try {
      const index = await this.db.read<any>('file-index.json');
      const files = index.files || {};
      for (const [path, entry] of Object.entries(files) as [string, any][]) {
        if (entry.id === id && !entry.isDirectory) {
          return {
            id: entry.id,
            name: path.split('/').pop() || path,
            path: path
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}

function createLinkingDependencies(rootPath: string) {
  const db = new JsonDatabase(rootPath);
  const linkRepo = new LinkJsonRepository(rootPath);
  const docLinkRepo = new DocumentLinkJsonRepository(rootPath);
  const documentRepo = new DocumentJsonRepository(db);

  const validator = new DocumentLinkValidatorService(docLinkRepo);
  const migrationService = new LinkMigrationService();
  const codeFilePort = new FilesystemCodeFileQueryAdapter(db);

  return { linkRepo, docLinkRepo, documentRepo, validator, migrationService, codeFilePort };
}

function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) return null;
  return workspaceId.trim();
}

// Global workspace root for event‑driven operations (single‑window app)
let currentWorkspaceRoot: string | null = null;

class DocumentDeletedEventHandler implements IDomainEventHandler<DocumentDeletedEvent> {
  async handle(event: DocumentDeletedEvent): Promise<void> {
    const rootPath = currentWorkspaceRoot;
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

// ─── Cross-Domain Event Subscribers for Link Count Synchronization ───────────

async function recalculateAndSaveDocumentLinkCount(rootPath: string, documentId: string): Promise<void> {
  try {
    const db = new JsonDatabase(rootPath);
    const docRepo = new DocumentJsonRepository(db);
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

class LinkCreatedEventHandler implements IDomainEventHandler<LinkCreatedEvent> {
  async handle(event: LinkCreatedEvent): Promise<void> {
    const rootPath = currentWorkspaceRoot;
    if (!rootPath) return;
    
    // In CodeToDocLink, category is 'code', sourceId is codeFileId, targetId is documentId
    if (event.category === 'code') {
      await recalculateAndSaveDocumentLinkCount(rootPath, event.targetId);
    }
  }
}

class LinkBrokenEventHandler implements IDomainEventHandler<LinkBrokenEvent> {
  async handle(event: LinkBrokenEvent): Promise<void> {
    const rootPath = currentWorkspaceRoot;
    if (!rootPath) return;
    
    if (event.category === 'code') {
      await recalculateAndSaveDocumentLinkCount(rootPath, event.targetId);
    }
  }
}

class DocumentLinkCreatedEventHandler implements IDomainEventHandler<DocumentLinkCreatedEvent> {
  async handle(event: DocumentLinkCreatedEvent): Promise<void> {
    const rootPath = currentWorkspaceRoot;
    if (!rootPath) return;
    await recalculateAndSaveDocumentLinkCount(rootPath, event.parentDocumentId);
    await recalculateAndSaveDocumentLinkCount(rootPath, event.childDocumentId);
  }
}

class DocumentLinkBrokenEventHandler implements IDomainEventHandler<DocumentLinkBrokenEvent> {
  async handle(event: DocumentLinkBrokenEvent): Promise<void> {
    const rootPath = currentWorkspaceRoot;
    if (!rootPath) return;
    await recalculateAndSaveDocumentLinkCount(rootPath, event.parentDocumentId);
    await recalculateAndSaveDocumentLinkCount(rootPath, event.childDocumentId);
  }
}

export function registerLinkingHandlers(): void {
  // 1. Create Code Link
  ipcMain.handle(IpcChannels.LINKING_CREATE_LINK, async (_event, workspaceId: unknown, codeFileId: string, documentId: string): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { linkRepo } = createLinkingDependencies(rootPath);
      const handler = new CreateLinkHandler(linkRepo);
      const result = await handler.execute(new CreateLinkCommand(codeFileId, documentId));
      return result.fold<IpcResponse<void>>(() => ({ success: true }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 2. Remove Code Link
  ipcMain.handle(IpcChannels.LINKING_REMOVE_LINK, async (_event, workspaceId: unknown, linkId: string): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { linkRepo } = createLinkingDependencies(rootPath);
      const handler = new RemoveLinkHandler(linkRepo);
      const result = await handler.execute(new RemoveLinkCommand(linkId));
      return result.fold<IpcResponse<void>>(() => ({ success: true }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 3. Create Document Link
  ipcMain.handle(IpcChannels.LINKING_CREATE_DOCUMENT_LINK, async (_event, workspaceId: unknown, parentDocumentId: string, childDocumentId: string): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { docLinkRepo, documentRepo, validator } = createLinkingDependencies(rootPath);
      const handler = new CreateDocumentLinkHandler(docLinkRepo, documentRepo, validator);
      const result = await handler.execute(new CreateDocumentLinkCommand(parentDocumentId, childDocumentId));
      return result.fold<IpcResponse<void>>(() => ({ success: true }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 4. Remove Document Link
  ipcMain.handle(IpcChannels.LINKING_REMOVE_DOCUMENT_LINK, async (_event, workspaceId: unknown, linkId: string): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { docLinkRepo } = createLinkingDependencies(rootPath);
      const handler = new RemoveDocumentLinkHandler(docLinkRepo);
      const result = await handler.execute(new RemoveDocumentLinkCommand(linkId));
      return result.fold<IpcResponse<void>>(() => ({ success: true }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 5. Migrate Links (manual trigger via IPC if needed)
  ipcMain.handle(IpcChannels.LINKING_MIGRATE_LINKS, async (_event, workspaceId: unknown, oldDocumentId: string, newDocumentIds: string[]): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { linkRepo, migrationService } = createLinkingDependencies(rootPath);
      const handler = new MigrateLinksHandler(linkRepo, migrationService);
      const result = await handler.execute(new MigrateLinksCommand(oldDocumentId, newDocumentIds));
      return result.fold<IpcResponse<void>>(() => ({ success: true }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 6. Get Links For Document
  ipcMain.handle(IpcChannels.LINKING_GET_LINKS_FOR_DOCUMENT, async (_event, workspaceId: unknown, documentId: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { linkRepo, codeFilePort } = createLinkingDependencies(rootPath);
      const handler = new GetLinksForDocumentHandler(linkRepo, codeFilePort);
      const result = await handler.execute(new GetLinksForDocumentQuery(documentId));
      return result.fold<IpcResponse<unknown>>((dto) => ({ success: true, data: dto }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 7. Get Links For CodeFile
  ipcMain.handle(IpcChannels.LINKING_GET_LINKS_FOR_CODEFILE, async (_event, workspaceId: unknown, codeFileId: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { linkRepo, codeFilePort } = createLinkingDependencies(rootPath);
      const handler = new GetLinksForCodeFileHandler(linkRepo, codeFilePort);
      const result = await handler.execute(new GetLinksForCodeFileQuery(codeFileId));
      return result.fold<IpcResponse<unknown>>((dto) => ({ success: true, data: dto }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 8. Get Unlinked CodeFiles
  ipcMain.handle(IpcChannels.LINKING_GET_UNLINKED_CODEFILES, async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { linkRepo, codeFilePort } = createLinkingDependencies(rootPath);
      const handler = new GetUnlinkedCodefilesHandler(linkRepo, codeFilePort);
      const result = await handler.execute(new GetUnlinkedCodefilesQuery());
      return result.fold<IpcResponse<unknown>>((dto) => ({ success: true, data: dto }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 9. Get Document Children
  ipcMain.handle(IpcChannels.LINKING_GET_DOCUMENT_CHILDREN, async (_event, workspaceId: unknown, parentDocumentId: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { docLinkRepo } = createLinkingDependencies(rootPath);
      const handler = new GetDocumentChildrenHandler(docLinkRepo);
      const result = await handler.execute(new GetDocumentChildrenQuery(parentDocumentId));
      return result.fold<IpcResponse<unknown>>((dto) => ({ success: true, data: dto }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 10. Get Document Parents
  ipcMain.handle(IpcChannels.LINKING_GET_DOCUMENT_PARENTS, async (_event, workspaceId: unknown, childDocumentId: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    currentWorkspaceRoot = rootPath;
    try {
      const { docLinkRepo } = createLinkingDependencies(rootPath);
      const handler = new GetDocumentParentsHandler(docLinkRepo);
      const result = await handler.execute(new GetDocumentParentsQuery(childDocumentId));
      return result.fold<IpcResponse<unknown>>((dto) => ({ success: true, data: dto }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 11. Create Bulk Code Links
  ipcMain.handle(
    IpcChannels.LINKING_CREATE_BULK_CODE_LINKS,
    async (_event, workspaceId: unknown, codeFileIds: string[], documentId: string): Promise<IpcResponse<BulkCreateResult>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      currentWorkspaceRoot = rootPath;
      try {
        const { linkRepo } = createLinkingDependencies(rootPath);
        const handler = new CreateBulkCodeLinksHandler(linkRepo);
        const result = await handler.execute(new CreateBulkCodeLinksCommand(codeFileIds, documentId));
        return result.fold<IpcResponse<BulkCreateResult>>(
          (data) => ({ success: true, data }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // ─── Register cross‑context event listeners ───────────────────────────────
  const eventBus = EventBus.getInstance();
  eventBus.register('DocumentDeletedEvent', new DocumentDeletedEventHandler());
  eventBus.register('LinkCreatedEvent', new LinkCreatedEventHandler());
  eventBus.register('LinkBrokenEvent', new LinkBrokenEventHandler());
  eventBus.register('DocumentLinkCreatedEvent', new DocumentLinkCreatedEventHandler());
  eventBus.register('DocumentLinkBrokenEvent', new DocumentLinkBrokenEventHandler());
}