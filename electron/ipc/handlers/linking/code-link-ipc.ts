import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createLinkingDependencies, IpcResponse } from './dependencies';
import { CreateLinkCommand } from '../../../../src/domains/linking/application/commands/create-link.command';
import { CreateLinkHandler } from '../../../../src/domains/linking/application/handlers/create-link.handler';
import { RemoveLinkCommand } from '../../../../src/domains/linking/application/commands/remove-link.command';
import { RemoveLinkHandler } from '../../../../src/domains/linking/application/handlers/remove-link.handler';
import { CreateBulkCodeLinksCommand } from '../../../../src/domains/linking/application/commands/create-bulk-code-links.command';
import { CreateBulkCodeLinksHandler, BulkCreateResult } from '../../../../src/domains/linking/application/handlers/create-bulk-code-links.handler';
import { GetLinksForDocumentQuery } from '../../../../src/domains/linking/application/queries/get-links-for-document.query';
import { GetLinksForDocumentHandler } from '../../../../src/domains/linking/application/handlers/get-links-for-document.handler';
import { GetLinksForCodeFileQuery } from '../../../../src/domains/linking/application/queries/get-links-for-codefile.query';
import { GetLinksForCodeFileHandler } from '../../../../src/domains/linking/application/handlers/get-links-for-codefile.handler';
import { GetUnlinkedCodefilesQuery } from '../../../../src/domains/linking/application/queries/get-unlinked-codefiles.query';
import { GetUnlinkedCodefilesHandler } from '../../../../src/domains/linking/application/handlers/get-unlinked-codefiles.handler';

export function registerCodeLinkIpcHandlers(): void {
  ipcMain.handle(
    IpcChannels.LINKING_CREATE_LINK,
    async (_event, workspaceId: unknown, codeFileId: string, documentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo } = createLinkingDependencies(rootPath);
        const handler = new CreateLinkHandler(linkRepo);
        const result = await handler.execute(new CreateLinkCommand(codeFileId, documentId));
        return result.fold<IpcResponse<void>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_REMOVE_LINK,
    async (_event, workspaceId: unknown, linkId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo } = createLinkingDependencies(rootPath);
        const handler = new RemoveLinkHandler(linkRepo);
        const result = await handler.execute(new RemoveLinkCommand(linkId));
        return result.fold<IpcResponse<void>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_GET_LINKS_FOR_DOCUMENT,
    async (_event, workspaceId: unknown, documentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo, codeFilePort } = createLinkingDependencies(rootPath);
        const handler = new GetLinksForDocumentHandler(linkRepo, codeFilePort);
        const result = await handler.execute(new GetLinksForDocumentQuery(documentId));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_GET_LINKS_FOR_CODEFILE,
    async (_event, workspaceId: unknown, codeFileId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo, codeFilePort } = createLinkingDependencies(rootPath);
        const handler = new GetLinksForCodeFileHandler(linkRepo, codeFilePort);
        const result = await handler.execute(new GetLinksForCodeFileQuery(codeFileId));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_GET_UNLINKED_CODEFILES,
    async (_event, workspaceId: unknown) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo, codeFilePort } = createLinkingDependencies(rootPath);
        const handler = new GetUnlinkedCodefilesHandler(linkRepo, codeFilePort);
        const result = await handler.execute(new GetUnlinkedCodefilesQuery());
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      })
  );

  ipcMain.handle(
    IpcChannels.LINKING_CREATE_BULK_CODE_LINKS,
    async (_event, workspaceId: unknown, codeFileIds: string[], documentId: string) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo } = createLinkingDependencies(rootPath);
        const handler = new CreateBulkCodeLinksHandler(linkRepo);
        const result = await handler.execute(new CreateBulkCodeLinksCommand(codeFileIds, documentId));
        return result.fold<IpcResponse<BulkCreateResult>>(
          (data) => ({ success: true, data }),
          (error) => ({ success: false, error })
        );
      })
  );
}