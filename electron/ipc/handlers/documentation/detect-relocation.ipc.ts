import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { DetectDocsFolderRelocationCommand } from '../../../../src/domains/documentation/application/commands/detect-docs-folder-relocation.command';
import { DetectDocsFolderRelocationHandler } from '../../../../src/domains/documentation/application/handlers/detect-docs-folder-relocation.handler';
import { DocsFolderDetectorService } from '../../../../src/domains/documentation/domain/services/docs-folder-detector.service';
import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';

export function registerDetectRelocationIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_DETECT_RELOCATION,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { configRepo, docFolderRepo, scanner } =
          createDocumentationDependencies(rootPath);
        const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
        const handler = new DetectDocsFolderRelocationHandler(
          docFolderRepo,
          configRepo,
          detectorService,
          scanner
        );
        const result = await handler.execute(
          new DetectDocsFolderRelocationCommand(rootPath)
        );
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}