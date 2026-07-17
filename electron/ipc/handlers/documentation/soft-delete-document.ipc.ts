import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { SoftDeleteDocumentCommand } from '../../../../src/domains/documentation/application/commands/soft-delete-document.command';
import { SoftDeleteDocumentHandler } from '../../../../src/domains/documentation/application/handlers/soft-delete-document.handler';

export function registerSoftDeleteDocumentIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_SOFT_DELETE_DOCUMENT,
    async (_event, documentId: string, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo } = createDocumentationDependencies(rootPath);
        const handler = new SoftDeleteDocumentHandler(documentRepo);
        const result = await handler.execute(
          new SoftDeleteDocumentCommand(documentId)
        );
        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}