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

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const workspaceRegistry = new Map<string, string>();

export function registerProjectHandlers(): void {
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
            workspaceRegistry.set(dto.id, rootPath);
          }
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

  ipcMain.handle(
    IpcChannels.PROJECT_GET_WORKSPACE,
    async (_event, workspaceId: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

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

  ipcMain.handle(
    IpcChannels.PROJECT_CHANGE_SCOPE,
    async (_event, workspaceId: string, newRootPath: string): Promise<IpcResponse<unknown>> => {
      try {
        const oldRootPath = workspaceRegistry.get(workspaceId);
        const db = new JsonDatabase(oldRootPath || '');
        const workspaceRepo = new WorkspaceJsonRepository(db);
        const handler = new ChangeWorkspaceScopeHandler(workspaceRepo);

        const result = await handler.execute(new ChangeWorkspaceScopeCommand(workspaceId, newRootPath));

        if (result.isSuccess) {
          workspaceRegistry.set(workspaceId, newRootPath);
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
}