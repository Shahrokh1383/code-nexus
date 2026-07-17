import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { JsonDatabase } from '../../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../src/infrastructure/persistence/database-schema';
import { ProjectConfigJsonRepository } from '../../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { DocFolderJsonRepository } from '../../../src/domains/documentation/infrastructure/repository/doc-folder-json.repository';
import { DocumentJsonRepository } from '../../../src/domains/documentation/infrastructure/repository/document-json.repository';
import { NodeFsDocumentScannerAdapter } from '../../../src/domains/documentation/infrastructure/adapters/node-fs-document-scanner.adapter';
import { NodeFsDeletionAdapter } from '../../../src/domains/documentation/infrastructure/adapters/node-fs-deletion.adapter';
import { DocsFolderDetectorService } from '../../../src/domains/documentation/domain/services/docs-folder-detector.service';
import { EventBus } from '../../../src/domains/shared-kernel/events/event-bus';
import { RegisterDocsFolderCommand } from '../../../src/domains/documentation/application/commands/register-docs-folder.command';
import { RegisterDocsFolderHandler } from '../../../src/domains/documentation/application/handlers/register-docs-folder.handler';
import { DetectDocsFolderRelocationCommand } from '../../../src/domains/documentation/application/commands/detect-docs-folder-relocation.command';
import { DetectDocsFolderRelocationHandler } from '../../../src/domains/documentation/application/handlers/detect-docs-folder-relocation.handler';
import { SoftDeleteDocumentCommand } from '../../../src/domains/documentation/application/commands/soft-delete-document.command';
import { SoftDeleteDocumentHandler } from '../../../src/domains/documentation/application/handlers/soft-delete-document.handler';
import { PermanentDeleteDocumentCommand } from '../../../src/domains/documentation/application/commands/permanent-delete-document.command';
import { PermanentDeleteDocumentHandler } from '../../../src/domains/documentation/application/handlers/permanent-delete-document.handler';
import { RestoreDocumentCommand } from '../../../src/domains/documentation/application/commands/restore-document.command';
import { RestoreDocumentHandler } from '../../../src/domains/documentation/application/handlers/restore-document.handler';
import { GetAllDocumentsQuery } from '../../../src/domains/documentation/application/queries/get-all-documents.query';
import { GetAllDocumentsHandler } from '../../../src/domains/documentation/application/handlers/get-all-documents.handler';
import { GetOrphanedDocumentsQuery } from '../../../src/domains/documentation/application/queries/get-orphaned-documents.query';
import { GetOrphanedDocumentsHandler } from '../../../src/domains/documentation/application/handlers/get-orphaned-documents.handler';
import { GetDeletedDocumentsQuery } from '../../../src/domains/documentation/application/queries/get-deleted-documents.query';
import { GetDeletedDocumentsHandler } from '../../../src/domains/documentation/application/handlers/get-deleted-documents.handler';
import { WorkspaceId } from '../../../src/domains/project/domain/value-objects/workspace-id';
import { DocumentId } from '../../../src/domains/documentation/domain/value-objects/document-id';
import { DocumentPath } from '../../../src/domains/documentation/domain/value-objects/document-path';
import { Document } from '../../../src/domains/documentation/domain/entities/document';
import { DateTime } from '../../../src/domains/shared-kernel/types/date-time';
import { PathUtils } from '../../../src/domains/shared-kernel/utils/path-utils';
import { DocumentDeletedEvent } from '../../../src/domains/documentation/domain/events/document-deleted';
import { LinkJsonRepository } from '../../../src/domains/linking/infrastructure/repository/link-json.repository';
import { DocumentLinkJsonRepository } from '../../../src/domains/linking/infrastructure/repository/document-link-json.repository';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function createDocumentationRepositories(rootPath: string) {
  const db = new JsonDatabase(rootPath);
  const schemaMigrator = new SchemaMigrator(DATABASE_SCHEMA_VERSION);
  const configRepo = new ProjectConfigJsonRepository(db, schemaMigrator);
  const docFolderRepo = new DocFolderJsonRepository(db);
  const documentRepo = new DocumentJsonRepository(db);
  return { configRepo, docFolderRepo, documentRepo };
}

function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) return null;
  return workspaceId.trim();
}

const DOCUMENT_EXTENSIONS = /\.(md|txt|rst|adoc|mdx)$/i;

export function registerDocumentationHandlers(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_REGISTER_FOLDER,
    async (_event, workspaceId: unknown, suggestedPath?: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { configRepo, docFolderRepo, documentRepo } = createDocumentationRepositories(rootPath);
        const scanner = new NodeFsDocumentScannerAdapter(rootPath);
        const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
        const handler = new RegisterDocsFolderHandler(docFolderRepo, documentRepo, configRepo, detectorService, scanner);
        const result = await handler.execute(new RegisterDocsFolderCommand(workspaceId as string, suggestedPath));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_DETECT_RELOCATION,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { configRepo, docFolderRepo } = createDocumentationRepositories(rootPath);
        const scanner = new NodeFsDocumentScannerAdapter(rootPath);
        const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
        const handler = new DetectDocsFolderRelocationHandler(docFolderRepo, configRepo, detectorService, scanner);
        const result = await handler.execute(new DetectDocsFolderRelocationCommand(workspaceId as string));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ALL,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo, docFolderRepo, configRepo } = createDocumentationRepositories(rootPath);
        const handler = new GetAllDocumentsHandler(documentRepo, docFolderRepo, configRepo);
        const result = await handler.execute(new GetAllDocumentsQuery(workspaceId as string));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ORPHANED,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const handler = new GetOrphanedDocumentsHandler(documentRepo);
        const result = await handler.execute(new GetOrphanedDocumentsQuery());
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_SOFT_DELETE_DOCUMENT,
    async (_event, documentId: string, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const handler = new SoftDeleteDocumentHandler(documentRepo);
        const result = await handler.execute(new SoftDeleteDocumentCommand(documentId));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_PERMANENT_DELETE_DOCUMENT,
    async (_event, documentId: string, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const deletionAdapter = new NodeFsDeletionAdapter(rootPath);
        const handler = new PermanentDeleteDocumentHandler(documentRepo, deletionAdapter);
        const result = await handler.execute(new PermanentDeleteDocumentCommand(documentId));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_RESTORE_DOCUMENT,
    async (_event, documentId: string, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const handler = new RestoreDocumentHandler(documentRepo);
        const result = await handler.execute(new RestoreDocumentCommand(documentId));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_DELETED,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const handler = new GetDeletedDocumentsHandler(documentRepo);
        const result = await handler.execute(new GetDeletedDocumentsQuery(workspaceId as string));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_SYNC_FILES,
    async (_event, workspaceId: unknown): Promise<IpcResponse<void>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
      try {
        const { documentRepo, configRepo } = createDocumentationRepositories(rootPath);
        const config = await configRepo.findByWorkspaceId(new WorkspaceId(rootPath));
        const docsFolderPath = config?.docsFolderPath.getOrNull();
        if (!docsFolderPath) return { success: true };

        const scanner = new NodeFsDocumentScannerAdapter(rootPath);
        const allFiles = await scanner.scanFolder(docsFolderPath);
        const documentFiles = allFiles.filter(f => !f.isDirectory && DOCUMENT_EXTENSIONS.test(f.name));
        const currentFilePaths = documentFiles.map(f => PathUtils.join(docsFolderPath, f.path));

        const existingDocs = await documentRepo.findAll();
        const existingNonDeleted = existingDocs.filter(d => !d.deleted);
        const existingPaths = new Set(existingNonDeleted.map(d => d.path.value));

        for (const doc of existingNonDeleted) {
          if (!currentFilePaths.includes(doc.path.value)) {
            await documentRepo.delete(doc.id);
            await EventBus.getInstance().emit(new DocumentDeletedEvent(doc.id, doc.path));
          }
        }

        const existingAllPaths = new Set(existingDocs.map(d => d.path.value));
        const newPaths = currentFilePaths.filter(p => !existingAllPaths.has(p));
        for (const newPath of newPaths) {
          const segments = newPath.split('/');
          const fileName = segments[segments.length - 1];
          const title = fileName.replace(/\.[^/.]+$/, '').charAt(0).toUpperCase() + fileName.replace(/\.[^/.]+$/, '').slice(1);
          const document = new Document(DocumentId.generate(), new DocumentPath(newPath), title, DateTime.now(), 0);
          await documentRepo.save(document);
        }

        try {
          const linkRepo = new LinkJsonRepository(rootPath);
          const docLinkRepo = new DocumentLinkJsonRepository(rootPath);
          const allCurrentDocs = await documentRepo.findAllNonDeleted();
          for (const doc of allCurrentDocs) {
            const codeLinks = await linkRepo.findByDocument(doc.id);
            const parentDocLinks = await docLinkRepo.findByParentDocument(doc.id);
            const childDocLinks = await docLinkRepo.findByChildDocument(doc.id);
            const totalCount = codeLinks.length + parentDocLinks.length + childDocLinks.length;
            if (doc.linkCount !== totalCount) {
              doc.updateLinkCount(totalCount);
              await documentRepo.save(doc);
            }
          }
        } catch (error) {
          console.error('Failed to self-heal document link counts', error);
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Sync failed' };
      }
    }
  );
}