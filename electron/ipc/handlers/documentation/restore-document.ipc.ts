import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { RestoreDocumentCommand } from '../../../../src/domains/documentation/application/commands/restore-document.command';
import { RestoreDocumentHandler } from '../../../../src/domains/documentation/application/handlers/restore-document.handler';

export function registerRestoreDocumentIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_RESTORE_DOCUMENT,
    async (_event, documentId: string, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo } = createDocumentationDependencies(rootPath);
        const handler = new RestoreDocumentHandler(documentRepo);
        const result = await handler.execute(
          new RestoreDocumentCommand(documentId)
        );
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}