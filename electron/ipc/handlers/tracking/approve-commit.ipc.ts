import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createTrackingDependencies, IpcResponse } from './dependencies';
import { ApproveCommitCommand } from '../../../../src/domains/tracking/application/commands/approve-commit.command';
import { ApproveCommitHandler } from '../../../../src/domains/tracking/application/handlers/approve-commit.handler';

export function registerApproveCommitIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.TRACKING_APPROVE_COMMIT,
    async (_event, workspaceId: unknown, documentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { hashRepo, cacheRepo, linkedDocQuery } =
          createTrackingDependencies(rootPath);
        const handler = new ApproveCommitHandler(
          hashRepo,
          cacheRepo,
          linkedDocQuery
        );
        const result = await handler.execute(new ApproveCommitCommand(documentId));
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}