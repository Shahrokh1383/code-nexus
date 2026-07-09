import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { workspaceRegistry } from './project-handlers';
import { JsonDatabase } from '../../../src/infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../src/infrastructure/persistence/migration/schema-migrator';
import { DATABASE_SCHEMA_VERSION } from '../../../src/infrastructure/persistence/database-schema';
import { WorkspaceJsonRepository } from '../../../src/domains/project/infrastructure/repository/workspace-json.repository';
import { ProjectConfigJsonRepository } from '../../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { FileSystemJsonRepository } from '../../../src/domains/filesystem/infrastructure/repository/filesystem-json.repository';
import { NodeFsAdapter } from '../../../src/domains/filesystem/infrastructure/adapters/node-fs.adapter';
import { ScanProjectCommand } from '../../../src/domains/filesystem/application/commands/scan-project.command';
import { ScanProjectHandler } from '../../../src/domains/filesystem/application/handlers/scan-project.handler';
import { GetFileTreeQuery } from '../../../src/domains/filesystem/application/queries/get-file-tree.query';
import { GetFileTreeHandler } from '../../../src/domains/filesystem/application/handlers/get-file-tree.handler';
import { AddIgnorePatternCommand } from '../../../src/domains/filesystem/application/commands/add-ignore-pattern.command';
import { AddIgnorePatternHandler } from '../../../src/domains/filesystem/application/handlers/add-ignore-pattern.handler';
import { RemoveIgnorePatternCommand } from '../../../src/domains/filesystem/application/commands/remove-ignore-pattern.command';
import { RemoveIgnorePatternHandler } from '../../../src/domains/filesystem/application/handlers/remove-ignore-pattern.handler';
import { GetIgnoredFilesQuery } from '../../../src/domains/filesystem/application/queries/get-ignored-files.query';
import { GetIgnoredFilesHandler } from '../../../src/domains/filesystem/application/handlers/get-ignored-files.handler';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function createRepositories(rootPath: string) {
  const db = new JsonDatabase(rootPath);
  const workspaceRepo = new WorkspaceJsonRepository(db);
  const configRepo = new ProjectConfigJsonRepository(db, new SchemaMigrator(DATABASE_SCHEMA_VERSION));
  const fileSystemRepo = new FileSystemJsonRepository(db);
  return { workspaceRepo, configRepo, fileSystemRepo };
}

export function registerFilesystemHandlers(): void {
  ipcMain.handle(
    IpcChannels.FILESYSTEM_SCAN_PROJECT,
    async (_event, workspaceId: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

        const { workspaceRepo, configRepo, fileSystemRepo } = createRepositories(rootPath);
        const fileSystemAdapter = new NodeFsAdapter();
        const handler = new ScanProjectHandler(workspaceRepo, configRepo, fileSystemRepo, fileSystemAdapter);

        const result = await handler.execute(new ScanProjectCommand(workspaceId));

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
    IpcChannels.FILESYSTEM_GET_FILE_TREE,
    async (_event, workspaceId: string, parentPath?: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

        const { fileSystemRepo } = createRepositories(rootPath);
        const handler = new GetFileTreeHandler(fileSystemRepo);

        const result = await handler.execute(new GetFileTreeQuery(workspaceId, parentPath));

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
    IpcChannels.FILESYSTEM_ADD_IGNORE_PATTERN,
    async (_event, workspaceId: string, pattern: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

        const { configRepo } = createRepositories(rootPath);
        const handler = new AddIgnorePatternHandler(configRepo);

        const result = await handler.execute(new AddIgnorePatternCommand(workspaceId, pattern));

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

  ipcMain.handle(
    IpcChannels.FILESYSTEM_REMOVE_IGNORE_PATTERN,
    async (_event, workspaceId: string, pattern: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

        const { configRepo } = createRepositories(rootPath);
        const handler = new RemoveIgnorePatternHandler(configRepo);

        const result = await handler.execute(new RemoveIgnorePatternCommand(workspaceId, pattern));

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

  ipcMain.handle(
    IpcChannels.FILESYSTEM_GET_IGNORED_FILES,
    async (_event, workspaceId: string): Promise<IpcResponse<unknown>> => {
      try {
        const rootPath = workspaceRegistry.get(workspaceId);
        if (!rootPath) {
          return { success: false, error: 'Workspace not found in registry' };
        }

        const { configRepo } = createRepositories(rootPath);
        const handler = new GetIgnoredFilesHandler(configRepo);

        const result = await handler.execute(new GetIgnoredFilesQuery(workspaceId));

        return result.fold<IpcResponse<unknown>>(
          (patterns) => ({ success: true, data: patterns }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
      }
    }
  );
}