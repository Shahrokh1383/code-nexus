import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { PermanentDeleteDocumentCommand } from '../../../../src/domains/documentation/application/commands/permanent-delete-document.command';
import { PermanentDeleteDocumentHandler } from '../../../../src/domains/documentation/application/handlers/permanent-delete-document.handler';

export function registerPermanentDeleteDocumentIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_PERMANENT_DELETE_DOCUMENT,
    async (_event, documentId: string, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo, deletionAdapter } =
          createDocumentationDependencies(rootPath);
        const handler = new PermanentDeleteDocumentHandler(
          documentRepo,
          deletionAdapter
        );
        const result = await handler.execute(
          new PermanentDeleteDocumentCommand(documentId)
        );
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}