import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createTrackingDependencies, IpcResponse } from './dependencies';
import { GetCommitHistoryQuery } from '../../../../src/domains/tracking/application/queries/get-commit-history.query';
import { GetCommitHistoryHandler } from '../../../../src/domains/tracking/application/handlers/get-commit-history.handler';
import { GranularCommitDto } from '../../../../src/domains/tracking/application/dto/granular-commit.dto';

export function registerCommitHistoryIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.TRACKING_GET_COMMIT_HISTORY,
    async (_event, workspaceId: unknown, documentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { commitRepo } = createTrackingDependencies(rootPath);
        const handler = new GetCommitHistoryHandler(commitRepo);
        const result = await handler.execute(new GetCommitHistoryQuery(documentId));
        return result.fold<IpcResponse<GranularCommitDto[]>>(
          (dtos) => ({ success: true, data: dtos }),
          (error) => ({ success: false, error })
        );
      })
  );
}