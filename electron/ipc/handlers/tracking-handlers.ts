import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { JsonDatabase } from '../../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../src/infrastructure/persistence/database-schema';
import { TrackingJsonRepository } from '../../../src/domains/tracking/infrastructure/repository/tracking-json.repository';
import { FileContentReaderAdapter } from '../../../src/domains/tracking/infrastructure/adapters/file-content-reader.adapter';
import { RecordHashCommand } from '../../../src/domains/tracking/application/commands/record-hash.command';
import { RecordHashHandler } from '../../../src/domains/tracking/application/handlers/record-hash.handler';
import { DetectChangesCommand } from '../../../src/domains/tracking/application/commands/detect-changes.command';
import { DetectChangesHandler } from '../../../src/domains/tracking/application/handlers/detect-changes.handler';
import { ApproveCommitCommand } from '../../../src/domains/tracking/application/commands/approve-commit.command';
import { ApproveCommitHandler } from '../../../src/domains/tracking/application/handlers/approve-commit.handler';
import { GetPendingChangesQuery } from '../../../src/domains/tracking/application/queries/get-pending-changes.query';
import { GetPendingChangesHandler } from '../../../src/domains/tracking/application/handlers/get-pending-changes.handler';
import { GetCommitHistoryQuery } from '../../../src/domains/tracking/application/queries/get-commit-history.query';
import { GetCommitHistoryHandler } from '../../../src/domains/tracking/application/handlers/get-commit-history.handler';
import { ILinkedDocumentQueryPort } from '../../../src/domains/tracking/application/ports/linked-document-query.port';
import { DocumentId } from '../../../src/domains/documentation/domain/value-objects/document-id';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates that the workspace ID is a non-empty string.
 */
function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
    return null;
  }
  return workspaceId.trim();
}

/**
 * Stub implementation of ILinkedDocumentQueryPort.
 * Returns empty until the Linking context is implemented.
 * This prevents compilation errors and maintains Bounded Context Isolation.
 */
class StubLinkedDocumentQueryPort implements ILinkedDocumentQueryPort {
  async findLinkedDocuments(_filePath: string): Promise<DocumentId[]> {
    return [];
  }
}

function createTrackingRepository(workspaceRoot: string) {
  return new TrackingJsonRepository(workspaceRoot);
}

function createLinkedDocQuery(): ILinkedDocumentQueryPort {
  return new StubLinkedDocumentQueryPort();
}

export function registerTrackingHandlers(): void {
  // ── RECORD HASH ───────────────────────────────────
  ipcMain.handle(
    IpcChannels.TRACKING_RECORD_HASH,
    async (_event, workspaceId: unknown, filePath: string, content: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const repository = createTrackingRepository(rootPath);
        const linkedDocQuery = createLinkedDocQuery();
        const handler = new RecordHashHandler(repository, linkedDocQuery);

        const result = await handler.execute(new RecordHashCommand(filePath, content));

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── DETECT CHANGES ───────────────────────────────
  ipcMain.handle(
    IpcChannels.TRACKING_DETECT_CHANGES,
    async (_event, workspaceId: unknown, filePath: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const repository = createTrackingRepository(rootPath);
        const contentReader = new FileContentReaderAdapter(rootPath);
        const linkedDocQuery = createLinkedDocQuery();
        const handler = new DetectChangesHandler(contentReader, repository, linkedDocQuery);

        const result = await handler.execute(new DetectChangesCommand(filePath));

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── APPROVE COMMIT ────────────────────────────────
  ipcMain.handle(
    IpcChannels.TRACKING_APPROVE_COMMIT,
    async (_event, workspaceId: unknown, documentId: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const repository = createTrackingRepository(rootPath);
        const handler = new ApproveCommitHandler(repository);

        const result = await handler.execute(new ApproveCommitCommand(documentId));

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── GET PENDING CHANGES ───────────────────────────
  ipcMain.handle(
    IpcChannels.TRACKING_GET_PENDING_CHANGES,
    async (_event, workspaceId: unknown, documentId?: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const repository = createTrackingRepository(rootPath);
        const linkedDocQuery = createLinkedDocQuery();
        const handler = new GetPendingChangesHandler(repository, linkedDocQuery);

        const result = await handler.execute(new GetPendingChangesQuery(documentId));

        return result.fold<IpcResponse<unknown>>(
          (dtos) => ({ success: true, data: dtos }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ── GET COMMIT HISTORY ────────────────────────────
  ipcMain.handle(
    IpcChannels.TRACKING_GET_COMMIT_HISTORY,
    async (_event, workspaceId: unknown, documentId: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const repository = createTrackingRepository(rootPath);
        const handler = new GetCommitHistoryHandler(repository);

        const result = await handler.execute(new GetCommitHistoryQuery(documentId));

        return result.fold<IpcResponse<unknown>>(
          (dtos) => ({ success: true, data: dtos }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );
}