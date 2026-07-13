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

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Anti-Corruption Layer (ACL) Adapter.
 * Allows the Linking context to query FileSystem data without importing FileSystem domain classes directly.
 */
class FilesystemCodeFileQueryAdapter implements ICodeFileQueryPort {
  constructor(private readonly db: JsonDatabase) {}
  
  async getAllCodeFiles(): Promise<CodeFileSummaryDto[]> {
    try {
      const index = await this.db.read<any>('files.json');
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

export function registerLinkingHandlers(): void {
  // 1. Create Code Link
  ipcMain.handle(IpcChannels.LINKING_CREATE_LINK, async (_event, workspaceId: unknown, codeFileId: string, documentId: string): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
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
    try {
      const { docLinkRepo } = createLinkingDependencies(rootPath);
      const handler = new RemoveDocumentLinkHandler(docLinkRepo);
      const result = await handler.execute(new RemoveDocumentLinkCommand(linkId));
      return result.fold<IpcResponse<void>>(() => ({ success: true }), (error) => ({ success: false, error }));
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // 5. Migrate Links
  ipcMain.handle(IpcChannels.LINKING_MIGRATE_LINKS, async (_event, workspaceId: unknown, oldDocumentId: string, newDocumentIds: string[]): Promise<IpcResponse<void>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
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
    try {
      const { linkRepo } = createLinkingDependencies(rootPath);
      const handler = new GetLinksForDocumentHandler(linkRepo);
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
    try {
      const { linkRepo } = createLinkingDependencies(rootPath);
      const handler = new GetLinksForCodeFileHandler(linkRepo);
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
    async (_event, workspaceId: unknown, codeFileIds: string[],   documentId: string): Promise<IpcResponse<BulkCreateResult>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace   ID' };
      try {
        const { linkRepo } = createLinkingDependencies(rootPath);
        const handler = new CreateBulkCodeLinksHandler(linkRepo);
        const result = await handler.execute(new CreateBulkCodeLinksCommand (codeFileIds, documentId));
        return result.fold<IpcResponse<BulkCreateResult>>(
          (data) => ({ success: true, data }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error. message : 'Unknown error' };
      }
    }
  );
}