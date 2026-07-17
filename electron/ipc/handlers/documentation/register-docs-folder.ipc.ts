import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { RegisterDocsFolderCommand } from '../../../../src/domains/documentation/application/commands/register-docs-folder.command';
import { RegisterDocsFolderHandler } from '../../../../src/domains/documentation/application/handlers/register-docs-folder.handler';
import { DocsFolderDetectorService } from '../../../../src/domains/documentation/domain/services/docs-folder-detector.service';
import { EventBus } from '../../../../src/domains/shared-kernel/events/event-bus';

export function registerRegisterDocsFolderIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_REGISTER_FOLDER,
    async (_event, workspaceId: unknown, suggestedPath?: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { configRepo, docFolderRepo, documentRepo, scanner } =
          createDocumentationDependencies(rootPath);
        const detectorService = new DocsFolderDetectorService(EventBus.getInstance());
        const handler = new RegisterDocsFolderHandler(
          docFolderRepo,
          documentRepo,
          configRepo,
          detectorService,
          scanner
        );
        const result = await handler.execute(
          new RegisterDocsFolderCommand(rootPath, suggestedPath)
        );
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}