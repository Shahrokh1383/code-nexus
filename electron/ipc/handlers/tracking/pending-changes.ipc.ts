import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createTrackingDependencies, IpcResponse } from './dependencies';
import { GetPendingChangesQuery } from '../../../../src/domains/tracking/application/queries/get-pending-changes.query';
import { GetPendingChangesHandler } from '../../../../src/domains/tracking/application/handlers/get-pending-changes.handler';
import { GetAllPendingStatusQuery } from '../../../../src/domains/tracking/application/queries/get-all-pending-status.query';
import { GetAllPendingStatusHandler } from '../../../../src/domains/tracking/application/handlers/get-all-pending-status.handler';
import { FileHashDto } from '../../../../src/domains/tracking/application/dto/file-hash.dto';
import { PendingStatusDto } from '../../../../src/domains/tracking/application/dto/pending-status.dto';

export function registerPendingChangesIpcHandlers(): void {
  // Existing: pending changes for a specific document
  ipcMain.handle(
    IpcChannels.TRACKING_GET_PENDING_CHANGES,
    async (_event, workspaceId: unknown, documentId?: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { hashRepo, linkedDocQuery } = createTrackingDependencies(rootPath);
        const handler = new GetPendingChangesHandler(hashRepo, linkedDocQuery);
        const result = await handler.execute(new GetPendingChangesQuery(documentId));
        return result.fold<IpcResponse<FileHashDto[]>>(
          (dtos) => ({ success: true, data: dtos }),
          (error) => ({ success: false, error })
        );
      })
  );

  // New: aggregated pending status for all documents
  ipcMain.handle(
    IpcChannels.TRACKING_GET_ALL_PENDING_STATUS,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { hashRepo, linkedDocQuery } = createTrackingDependencies(rootPath);
        const handler = new GetAllPendingStatusHandler(hashRepo, linkedDocQuery);
        const result = await handler.execute(new GetAllPendingStatusQuery());
        return result.fold<IpcResponse<PendingStatusDto[]>>(
          (dtos) => ({ success: true, data: dtos }),
          (error) => ({ success: false, error })
        );
      })
  );
}