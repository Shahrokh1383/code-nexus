import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { GetDeletedDocumentsQuery } from '../../../../src/domains/documentation/application/queries/get-deleted-documents.query';
import { GetDeletedDocumentsHandler } from '../../../../src/domains/documentation/application/handlers/get-deleted-documents.handler';

export function registerGetDeletedDocumentsIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_DELETED,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo } = createDocumentationDependencies(rootPath);
        const handler = new GetDeletedDocumentsHandler(documentRepo);
        const result = await handler.execute(
          new GetDeletedDocumentsQuery(rootPath)
        );
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );
}