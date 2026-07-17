import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { GetAllDocumentsQuery } from '../../../../src/domains/documentation/application/queries/get-all-documents.query';
import { GetAllDocumentsHandler } from '../../../../src/domains/documentation/application/handlers/get-all-documents.handler';

export function registerGetAllDocumentsIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ALL,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo, docFolderRepo, configRepo } =
          createDocumentationDependencies(rootPath);
        const handler = new GetAllDocumentsHandler(
          documentRepo,
          docFolderRepo,
          configRepo
        );
        const result = await handler.execute(new GetAllDocumentsQuery(rootPath));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );
}