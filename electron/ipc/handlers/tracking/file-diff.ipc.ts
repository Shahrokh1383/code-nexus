import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createTrackingDependencies, IpcResponse } from './dependencies';
import { GetFileDiffQuery } from '../../../../src/domains/tracking/application/queries/get-file-diff.query';
import { GetFileDiffHandler } from '../../../../src/domains/tracking/application/handlers/get-file-diff.handler';
import { ContentDiffDto } from '../../../../src/domains/tracking/application/dto/content-diff.dto';

export function registerFileDiffIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.TRACKING_GET_FILE_DIFF,
    async (_event, workspaceId: unknown, filePath: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { hashRepo } = createTrackingDependencies(rootPath);
        const handler = new GetFileDiffHandler(hashRepo);
        const result = await handler.execute(new GetFileDiffQuery(filePath));
        return result.fold<IpcResponse<ContentDiffDto | null>>(
          (diff) => ({ success: true, data: diff }),
          (error) => ({ success: false, error })
        );
      })
  );
}