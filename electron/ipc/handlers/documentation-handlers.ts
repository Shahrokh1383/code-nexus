import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { workspaceRegistry } from './project-handlers';
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

export function registerDocumentationHandlers(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_REGISTER_FOLDER,
    async (
      _event,
      workspaceId: string,
      suggestedPath?: string
    ): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

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
          new RegisterDocsFolderCommand(workspaceId, suggestedPath)
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

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_DETECT_RELOCATION,
    async (
      _event,
      workspaceId: string
    ): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

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
          new DetectDocsFolderRelocationCommand(workspaceId)
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

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ALL,
    async (
      _event,
      workspaceId: string
    ): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

        const { documentRepo } = createDocumentationRepositories(rootPath);
        const handler = new GetAllDocumentsHandler(documentRepo);

        const result = await handler.execute(
          new GetAllDocumentsQuery(workspaceId)
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

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ORPHANED,
    async (
      _event,
      workspaceId: string
    ): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

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

  ipcMain.handle(
    IpcChannels.DOCUMENTATION_DELETE_DOCUMENT,
    async (
      _event,
      documentId: string,
      workspaceId: string
    ): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

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
}