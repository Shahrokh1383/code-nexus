import { ipcMain } from 'electron';
import { IpcChannels } from '../../channels';
import { handleIpcCall, createLinkingDependencies, IpcResponse } from './dependencies';
import { MigrateLinksCommand } from '../../../../src/domains/linking/application/commands/migrate-links.command';
import { MigrateLinksHandler } from '../../../../src/domains/linking/application/handlers/migrate-links.handler';

export function registerMigrationIpcHandler(): void {
  ipcMain.handle(
    IpcChannels.LINKING_MIGRATE_LINKS,
    async (_event, workspaceId: unknown, oldDocumentId: string, newDocumentIds: string[]) =>
      handleIpcCall(workspaceId, async (rootPath) => {
        const { linkRepo, migrationService } = createLinkingDependencies(rootPath);
        const handler = new MigrateLinksHandler(linkRepo, migrationService);
        const result = await handler.execute(new MigrateLinksCommand(oldDocumentId, newDocumentIds));
        return result.fold<IpcResponse<void>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      })
  );
}