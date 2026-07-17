import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createDocumentationDependencies, IpcResponse } from './dependencies';
import { GetOrphanedDocumentsQuery } from '../../../../src/domains/documentation/application/queries/get-orphaned-documents.query';
import { GetOrphanedDocumentsHandler } from '../../../../src/domains/documentation/application/handlers/get-orphaned-documents.handler';

export function registerGetOrphanedDocumentsIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.DOCUMENTATION_GET_ORPHANED,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { documentRepo } = createDocumentationDependencies(rootPath);
        const handler = new GetOrphanedDocumentsHandler(documentRepo);
        const result = await handler.execute(new GetOrphanedDocumentsQuery());
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );
}