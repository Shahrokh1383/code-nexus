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
import { DeleteDocumentCommand } from '../../../src/domains/documentation/application/commands/delete-document.command';
import { DeleteDocumentHandler } from '../../../src/domains/documentation/application/handlers/delete-document.handler';
import { GetAllDocumentsQuery } from '../../../src/domains/documentation/application/queries/get-all-documents.query';
import { GetAllDocumentsHandler } from '../../../src/domains/documentation/application/handlers/get-all-documents.handler';
import { GetOrphanedDocumentsQuery } from '../../../src/domains/documentation/application/queries/get-orphaned-documents.query';
import { GetOrphanedDocumentsHandler } from '../../../src/domains/documentation/application/handlers/get-orphaned-documents.handler';
import { WorkspaceId } from '../../../src/domains/project/domain/value-objects/workspace-id';

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
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
    return null;
  }
  return workspaceId.trim();
}

export function registerDocumentationHandlers(): void {
  // ── REGISTER FOLDER ────────────────────────────────
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_REGISTER_FOLDER,
    async (
      _event,
      workspaceId: unknown,
      suggestedPath?: string
    ): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { configRepo, docFolderRepo, documentRepo } =
          createDocumentationRepositories(rootPath);

        const scanner = new NodeFsDocumentScannerAdapter(rootPath);
        const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
        const handler = new RegisterDocsFolderHandler(
          docFolderRepo,
          documentRepo,
          configRepo,
          detectorService,
          scanner
        );

        const result = await handler.execute(
          new RegisterDocsFolderCommand(workspaceId as string, suggestedPath)
        );

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── DETECT RELOCATION ─────────────────────────────
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_DETECT_RELOCATION,
    async (
      _event,
      workspaceId: unknown
    ): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { configRepo, docFolderRepo } =
          createDocumentationRepositories(rootPath);

        const scanner = new NodeFsDocumentScannerAdapter(rootPath);
        const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
        const handler = new DetectDocsFolderRelocationHandler(
          docFolderRepo,
          configRepo,
          detectorService,
          scanner
        );

        const result = await handler.execute(
          new DetectDocsFolderRelocationCommand(workspaceId as string)
        );

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── GET ALL DOCUMENTS ─────────────────────────────
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ALL,
    async (
      _event,
      workspaceId: unknown
    ): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { documentRepo, docFolderRepo, configRepo } =
          createDocumentationRepositories(rootPath);
        const handler = new GetAllDocumentsHandler(documentRepo, docFolderRepo, configRepo);

        const result = await handler.execute(
          new GetAllDocumentsQuery(workspaceId as string)
        );

        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── GET ORPHANED DOCUMENTS ────────────────────────
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ORPHANED,
    async (
      _event,
      workspaceId: unknown
    ): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const handler = new GetOrphanedDocumentsHandler(documentRepo);

        const result = await handler.execute(new GetOrphanedDocumentsQuery());

        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── DELETE DOCUMENT ───────────────────────────────
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_DELETE_DOCUMENT,
    async (
      _event,
      documentId: string,
      workspaceId: unknown
    ): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const deletionAdapter = new NodeFsDeletionAdapter(rootPath);
        const handler = new DeleteDocumentHandler(documentRepo, deletionAdapter);

        const result = await handler.execute(
          new DeleteDocumentCommand(documentId)
        );

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

    // ── SYNC FILES (remove documents whose files no longer exist) ──
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_SYNC_FILES,
    async (_event, workspaceId: unknown): Promise<IpcResponse<void>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { documentRepo } = createDocumentationRepositories(rootPath);
        const scanner = new NodeFsDocumentScannerAdapter(rootPath);
        const documents = await documentRepo.findAll();

        for (const doc of documents) {
          const exists = await scanner.exists(doc.path.value);
          if (!exists) {
            await documentRepo.delete(doc.id);
          }
        }

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        return { success: false, error: message };
      }
    }
  );
}