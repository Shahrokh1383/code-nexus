import { ipcMain, app } from 'electron';
import { promises as fs } from 'fs';
import { IpcChannels } from '../channels';
import { InitializeWorkspaceCommand } from '../../../src/domains/project/application/commands/initialize-workspace.command';
import { InitializeWorkspaceHandler } from '../../../src/domains/project/application/handlers/initialize-workspace.handler';
import { ChangeWorkspaceScopeCommand } from '../../../src/domains/project/application/commands/change-workspace-scope.command';
import { ChangeWorkspaceScopeHandler } from '../../../src/domains/project/application/handlers/change-workspace-scope.handler';
import { GetWorkspaceQuery } from '../../../src/domains/project/application/queries/get-workspace.query';
import { GetWorkspaceHandler } from '../../../src/domains/project/application/handlers/get-workspace.handler';
import { JsonDatabase } from '../../../src/infrastructure/persistence/json-database';
import { WorkspaceJsonRepository } from '../../../src/domains/project/infrastructure/repository/workspace-json.repository';
import { ProjectConfigJsonRepository } from '../../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { SchemaMigrator } from '../../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../src/infrastructure/persistence/database-schema';
import { RecentWorkspacesAdapter, RecentWorkspaceDto } from '../../infrastructure/recent-workspaces.adapter';
import { EventBus } from '../../../src/domains/shared-kernel/events/event-bus';
import { WorkspaceClosedEvent } from '../../../src/domains/project/domain/events/workspace-closed';
import { WorkspaceId } from '../../../src/domains/project/domain/value-objects/workspace-id';
import { startWatcher, stopWatcher } from '../../bootstrap/watcher-lifecycle';
import { PathUtils } from '../../../src/domains/shared-kernel/utils/path-utils'; // NEW IMPORT

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const recentAdapter = new RecentWorkspacesAdapter();
const eventBus = EventBus.getInstance();

export function registerProjectHandlers(): void {
  ipcMain.handle(
    IpcChannels.PROJECT_INITIALIZE,
    async (_event, rootPath: string): Promise<IpcResponse<unknown>> => {
      try {
        // FIX: Normalize path immediately to ensure consistency
        const normalizedPath = PathUtils.normalize(rootPath);
        await fs.access(normalizedPath);
        
        const db = new JsonDatabase(normalizedPath);
        await db.ensureDoclinkExists();
        await db.writeTextFile('.docignore', 'node_modules/\n.git/\ndist/\nbuild/\n.doclink/\n*.log\n');

        const workspaceRepo = new WorkspaceJsonRepository(db);
        const configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
        const handler = new InitializeWorkspaceHandler(workspaceRepo, configRepo);

        const result = await handler.execute(new InitializeWorkspaceCommand(normalizedPath));

        if (result.isSuccess) {
          const dto = result.getValue();
          if (dto) {
            await recentAdapter.addOrUpdate({
              id: dto.id,
              rootPath: dto.rootPath,
              lastOpened: new Date().toISOString(),
            });
          }
          // Pass normalized path to watcher
          await startWatcher(normalizedPath, app.getPath('userData'));
        }

        return result.fold<IpcResponse<unknown>>(
          (value) => ({ success: true, data: value }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.PROJECT_GET_WORKSPACE,
    async (_event, workspaceId: string): Promise<IpcResponse<unknown>> => {
      try {
        // FIX: Normalize path for consistency
        const normalizedPath = PathUtils.normalize(workspaceId);
        const db = new JsonDatabase(normalizedPath);
        const workspaceRepo = new WorkspaceJsonRepository(db);
        const handler = new GetWorkspaceHandler(workspaceRepo);
        const result = await handler.execute(new GetWorkspaceQuery(normalizedPath));
        
        // FIX: Critical - Initialize watcher/context on app rehydration
        if (result.isSuccess) {
          await startWatcher(normalizedPath, app.getPath('userData'));
        }

        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.PROJECT_CHANGE_SCOPE,
    async (_event, workspaceId: string, newRootPath: string): Promise<IpcResponse<unknown>> => {
      try {
        const oldRootPath = PathUtils.normalize(workspaceId);
        const normalizedNewRootPath = PathUtils.normalize(newRootPath);
        
        const db = new JsonDatabase(oldRootPath);
        const workspaceRepo = new WorkspaceJsonRepository(db);
        const handler = new ChangeWorkspaceScopeHandler(workspaceRepo);
        const result = await handler.execute(new ChangeWorkspaceScopeCommand(oldRootPath, normalizedNewRootPath));
        
        if (result.isSuccess) {
          await stopWatcher();
          await startWatcher(normalizedNewRootPath, app.getPath('userData'));
        }

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.PROJECT_CLOSE,
    async (_event, workspaceId: string): Promise<IpcResponse<void>> => {
      try {
        await stopWatcher();
        eventBus.emit(new WorkspaceClosedEvent(new WorkspaceId(PathUtils.normalize(workspaceId))));
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to close workspace' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.PROJECT_GET_RECENT_WORKSPACES,
    async (): Promise<IpcResponse<RecentWorkspaceDto[]>> => {
      try {
        const recents = await recentAdapter.getRecent();
        return { success: true, data: recents };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch recent workspaces' };
      }
    }
  );

  ipcMain.handle(
    IpcChannels.PROJECT_REMOVE_RECENT_WORKSPACE,
    async (_event, workspaceId: string): Promise<IpcResponse<void>> => {
      try {
        await recentAdapter.remove(workspaceId);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to remove recent workspace' };
      }
    }
  );
}