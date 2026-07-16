import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createTrackingDependencies, IpcResponse } from './dependencies';
import { RecordHashCommand } from '../../../../src/domains/tracking/application/commands/record-hash.command';
import { RecordHashHandler } from '../../../../src/domains/tracking/application/handlers/record-hash.handler';
import { DetectChangesCommand } from '../../../../src/domains/tracking/application/commands/detect-changes.command';
import { DetectChangesHandler } from '../../../../src/domains/tracking/application/handlers/detect-changes.handler';

export function registerDetectChangesIpcHandlers(): void {
  ipcMain.handle(
    IpcChannels.TRACKING_RECORD_HASH,
    async (_event, workspaceId: unknown, filePath: string, content: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { hashRepo, diffService, contentReader } = createTrackingDependencies(rootPath);
        const handler = new RecordHashHandler(hashRepo, diffService, contentReader);
        const result = await handler.execute(new RecordHashCommand(filePath, content));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.TRACKING_DETECT_CHANGES,
    async (_event, workspaceId: unknown, filePath: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { contentReader, diffService, hashRepo } = createTrackingDependencies(rootPath);
        const recordHandler = new RecordHashHandler(hashRepo, diffService, contentReader);
        const handler = new DetectChangesHandler(contentReader, recordHandler);
        const result = await handler.execute(new DetectChangesCommand(filePath));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}