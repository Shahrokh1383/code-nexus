import { ipcMain } from 'electron';
import { promises as fs } from 'fs';
import { IpcChannels } from '../channels';
import { InitializeWorkspaceCommand } from '../../../src/domains/project/application/commands/initialize-workspace.command';
import { InitializeWorkspaceHandler } from '../../../src/domains/project/application/handlers/initialize-workspace.handler';
import { ChangeWorkspaceScopeCommand } from '../../../src/domains/project/application/commands/change-workspace-scope.command';
import { ChangeWorkspaceScopeHandler } from '../../../src/domains/project/application/handlers/change-workspace-scope.handler';
import { GetWorkspaceQuery } from '../../../src/domains/project/application/queries/get-workspace.query';
import { GetWorkspaceHandler } from '../../../src/domains/project/application/handlers/get-workspace.handler';
import { JsonDatabase } from '../../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../src/infrastructure/persistence/database-schema';
import { WorkspaceJsonRepository } from '../../../src/domains/project/infrastructure/repository/workspace-json.repository';
import { ProjectConfigJsonRepository } from '../../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { RecentWorkspacesAdapter, RecentWorkspaceDto } from '../../infrastructure/recent-workspaces.adapter';
import { EventBus } from '../../../src/domains/shared-kernel/events/event-bus';
import { WorkspaceClosedEvent } from '../../../src/domains/project/domain/events/workspace-closed';
import { WorkspaceId } from '../../../src/domains/project/domain/value-objects/workspace-id';
import { startWatcher, stopWatcher } from '../../bootstrap/watcher-lifecycle'; // NEW

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const recentAdapter = new RecentWorkspacesAdapter();
const eventBus = EventBus.getInstance();

export function registerProjectHandlers(): void {
  // ──────────────────────────────────────────────
  //  WORKSPACE INITIALIZE
  // ──────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.PROJECT_INITIALIZE,
    async (_event, rootPath: string): Promise<IpcResponse<unknown>> => {
      try {
        await fs.access(rootPath);

        const db = new JsonDatabase(rootPath);
        await db.ensureDoclinkExists();
        await db.writeTextFile('.docignore', 'node_modules/\n.git/\ndist/\nbuild/\n.doclink/\n*.log\n');

        const workspaceRepo = new WorkspaceJsonRepository(db);
        const configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
        const handler = new InitializeWorkspaceHandler(workspaceRepo, configRepo);

        const result = await handler.execute(new InitializeWorkspaceCommand(rootPath));

        if (result.isSuccess) {
          const dto = result.getValue();
          if (dto) {
            await recentAdapter.addOrUpdate({
              id: dto.id,
              rootPath: dto.rootPath,
              lastOpened: new Date().toISOString(),
            });
          }
          // Start file watching and tracking saga for this workspace
          await startWatcher(rootPath);
        }

        return result.fold<IpcResponse<unknown>>(
          (value) => ({ success: true, data: value }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ──────────────────────────────────────────────
  //  WORKSPACE GET
  // ──────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.PROJECT_GET_WORKSPACE,
    async (_event, workspaceId: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceId;
        const db = new JsonDatabase(rootPath);
        const workspaceRepo = new WorkspaceJsonRepository(db);
        const handler = new GetWorkspaceHandler(workspaceRepo);
        const result = await handler.execute(new GetWorkspaceQuery(workspaceId));
        return result.fold<IpcResponse<unknown>>(
          (dto) => ({ success: true, data: dto }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ──────────────────────────────────────────────
  //  WORKSPACE CHANGE SCOPE
  // ──────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.PROJECT_CHANGE_SCOPE,
    async (_event, workspaceId: string, newRootPath: string): Promise<IpcResponse<unknown>> => {
      try {
        const oldRootPath = workspaceId;
        const db = new JsonDatabase(oldRootPath);
        const workspaceRepo = new WorkspaceJsonRepository(db);
        const handler = new ChangeWorkspaceScopeHandler(workspaceRepo);
        const result = await handler.execute(new ChangeWorkspaceScopeCommand(workspaceId, newRootPath));
        
        if (result.isSuccess) {
          // Restart watcher for the new scope immediately
          await stopWatcher();
          await startWatcher(newRootPath);
        }

        return result.fold<IpcResponse<unknown>>(
          () => ({ success: true }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );

  // ──────────────────────────────────────────────
  //  WORKSPACE CLOSE
  // ──────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.PROJECT_CLOSE,
    async (_event, workspaceId: string): Promise<IpcResponse<void>> => {
      try {
        await stopWatcher(); // Stop file watching and saga before emitting closed event
        eventBus.emit(new WorkspaceClosedEvent(new WorkspaceId(workspaceId)));
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to close workspace';
        return { success: false, error: message };
      }
    }
  );

  // ──────────────────────────────────────────────
  //  RECENT WORKSPACES
  // ──────────────────────────────────────────────
  ipcMain.handle(
    IpcChannels.PROJECT_GET_RECENT_WORKSPACES,
    async (): Promise<IpcResponse<RecentWorkspaceDto[]>> => {
      try {
        const recents = await recentAdapter.getRecent();
        return { success: true, data: recents };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch recent workspaces';
        return { success: false, error: message };
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
        const message = error instanceof Error ? error.message : 'Failed to remove recent workspace';
        return { success: false, error: message };
      }
    }
  );
}