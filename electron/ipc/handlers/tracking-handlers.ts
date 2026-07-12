import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { TrackingJsonRepository } from '../../../src/domains/tracking/infrastructure/repository/tracking-json.repository';
import { CommitsJsonRepository } from '../../../src/domains/tracking/infrastructure/repository/commits-json.repository';
import { FileContentReaderAdapter } from '../../../src/domains/tracking/infrastructure/adapters/file-content-reader.adapter';
import { DiffCalculatorAdapter } from '../../../src/domains/tracking/infrastructure/adapters/diff-calculator.adapter';
import { DiffCalculatorService } from '../../../src/domains/tracking/domain/services/diff-calculator.service';
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
import { GetFileDiffQuery } from '../../../src/domains/tracking/application/queries/get-file-diff.query';
import { GetFileDiffHandler } from '../../../src/domains/tracking/application/handlers/get-file-diff.handler';
import { ILinkedDocumentQueryPort } from '../../../src/domains/tracking/application/ports/linked-document-query.port';
import { DocumentId } from '../../../src/domains/documentation/domain/value-objects/document-id';
import { ContentDiffDto } from '../../../src/domains/tracking/application/dto/content-diff.dto';
import { FileHashDto } from '../../../src/domains/tracking/application/dto/file-hash.dto';
import { GranularCommitDto } from '../../../src/domains/tracking/application/dto/granular-commit.dto';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) return null;
  return workspaceId.trim();
}

class StubLinkedDocumentQueryPort implements ILinkedDocumentQueryPort {
  async findLinkedDocuments(_filePath: string): Promise<DocumentId[]> { return []; }
  async findLinkedFiles(_documentId: string): Promise<string[]> { return []; }
}

function createHashRepository(workspaceRoot: string) { return new TrackingJsonRepository(workspaceRoot); }
function createCommitRepository(workspaceRoot: string) { return new CommitsJsonRepository(workspaceRoot); }
function createLinkedDocQuery(): ILinkedDocumentQueryPort { return new StubLinkedDocumentQueryPort(); }
function createDiffService(): DiffCalculatorService { return new DiffCalculatorService(new DiffCalculatorAdapter()); }

export function registerTrackingHandlers(): void {
  // ── RECORD HASH ───────────────────────────────────
  ipcMain.handle(IpcChannels.TRACKING_RECORD_HASH, async (_event, workspaceId: unknown, filePath: string, content: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    try {
      const handler = new RecordHashHandler(createHashRepository(rootPath), createDiffService());
      const result = await handler.execute(new RecordHashCommand(filePath, content));
      return result.fold<IpcResponse<unknown>>(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      );
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
  });

  // ── DETECT CHANGES ───────────────────────────────
  ipcMain.handle(IpcChannels.TRACKING_DETECT_CHANGES, async (_event, workspaceId: unknown, filePath: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    try {
      const handler = new DetectChangesHandler(
        new FileContentReaderAdapter(rootPath),
        createHashRepository(rootPath),
        createDiffService()
      );
      const result = await handler.execute(new DetectChangesCommand(filePath));
      return result.fold<IpcResponse<unknown>>(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      );
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
  });

  // ── APPROVE COMMIT ────────────────────────────────
  ipcMain.handle(IpcChannels.TRACKING_APPROVE_COMMIT, async (_event, workspaceId: unknown, documentId: string): Promise<IpcResponse<unknown>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    try {
      const handler = new ApproveCommitHandler(
        createHashRepository(rootPath),
        createCommitRepository(rootPath),
        createLinkedDocQuery()
      );
      const result = await handler.execute(new ApproveCommitCommand(documentId));
      return result.fold<IpcResponse<unknown>>(
        () => ({ success: true }),
        (error) => ({ success: false, error })
      );
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
  });

  // ── GET PENDING CHANGES ───────────────────────────
  ipcMain.handle(IpcChannels.TRACKING_GET_PENDING_CHANGES, async (_event, workspaceId: unknown, documentId?: string): Promise<IpcResponse<FileHashDto[]>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    try {
      const handler = new GetPendingChangesHandler(
        createHashRepository(rootPath),
        createLinkedDocQuery()
      );
      const result = await handler.execute(new GetPendingChangesQuery(documentId));
      return result.fold<IpcResponse<FileHashDto[]>>(
        (dtos) => ({ success: true, data: dtos }),
        (error) => ({ success: false, error })
      );
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
  });

  // ── GET COMMIT HISTORY ────────────────────────────
  ipcMain.handle(IpcChannels.TRACKING_GET_COMMIT_HISTORY, async (_event, workspaceId: unknown, documentId: string): Promise<IpcResponse<GranularCommitDto[]>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    try {
      const handler = new GetCommitHistoryHandler(createCommitRepository(rootPath));
      const result = await handler.execute(new GetCommitHistoryQuery(documentId));
      return result.fold<IpcResponse<GranularCommitDto[]>>(
        (dtos) => ({ success: true, data: dtos }),
        (error) => ({ success: false, error })
      );
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
  });

  // ── GET FILE DIFF ─────────────────────────────────
  ipcMain.handle(IpcChannels.TRACKING_GET_FILE_DIFF, async (_event, workspaceId: unknown, filePath: string): Promise<IpcResponse<ContentDiffDto | null>> => {
    const rootPath = validateWorkspaceId(workspaceId);
    if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
    try {
      const handler = new GetFileDiffHandler(createHashRepository(rootPath));
      const result = await handler.execute(new GetFileDiffQuery(filePath));
      return result.fold<IpcResponse<ContentDiffDto | null>>(
        (diff) => ({ success: true, data: diff }),
        (error) => ({ success: false, error })
      );
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }; }
  });
}