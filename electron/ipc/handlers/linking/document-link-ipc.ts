import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createLinkingDependencies, IpcResponse } from './dependencies';
import { CreateDocumentLinkCommand } from '../../../../src/domains/linking/application/commands/create-document-link.command';
import { CreateDocumentLinkHandler } from '../../../../src/domains/linking/application/handlers/create-document-link.handler';
import { RemoveDocumentLinkCommand } from '../../../../src/domains/linking/application/commands/remove-document-link.command';
import { RemoveDocumentLinkHandler } from '../../../../src/domains/linking/application/handlers/remove-document-link.handler';
import { GetDocumentChildrenQuery } from '../../../../src/domains/linking/application/queries/get-document-children.query';
import { GetDocumentChildrenHandler } from '../../../../src/domains/linking/application/handlers/get-document-children.handler';
import { GetDocumentParentsQuery } from '../../../../src/domains/linking/application/queries/get-document-parents.query';
import { GetDocumentParentsHandler } from '../../../../src/domains/linking/application/handlers/get-document-parents.handler';

export function registerDocumentLinkIpcHandlers(): void {
  ipcMain.handle(
    IpcChannels.LINKING_CREATE_DOCUMENT_LINK,
    async (_event, workspaceId: unknown, parentDocumentId: string, childDocumentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { docLinkRepo, documentRepo, validator } = createLinkingDependencies(rootPath);
        const handler = new CreateDocumentLinkHandler(docLinkRepo, documentRepo, validator);
        const result = await handler.execute(new CreateDocumentLinkCommand(parentDocumentId, childDocumentId));
        return result.fold<IpcResponse<void>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_REMOVE_DOCUMENT_LINK,
    async (_event, workspaceId: unknown, linkId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { docLinkRepo } = createLinkingDependencies(rootPath);
        const handler = new RemoveDocumentLinkHandler(docLinkRepo);
        const result = await handler.execute(new RemoveDocumentLinkCommand(linkId));
        return result.fold<IpcResponse<void>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_GET_DOCUMENT_CHILDREN,
    async (_event, workspaceId: unknown, parentDocumentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { docLinkRepo } = createLinkingDependencies(rootPath);
        const handler = new GetDocumentChildrenHandler(docLinkRepo);
        const result = await handler.execute(new GetDocumentChildrenQuery(parentDocumentId));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_GET_DOCUMENT_PARENTS,
    async (_event, workspaceId: unknown, childDocumentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { docLinkRepo } = createLinkingDependencies(rootPath);
        const handler = new GetDocumentParentsHandler(docLinkRepo);
        const result = await handler.execute(new GetDocumentParentsQuery(childDocumentId));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );
}