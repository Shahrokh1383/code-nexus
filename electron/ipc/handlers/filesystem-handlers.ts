import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
import { GetFileTreeQuery } from '../../../src/domains/filesystem/application/queries/get-file-tree.query';
import { GetFileTreeHandler } from '../../../src/domains/filesystem/application/handlers/get-file-tree.handler';
import { AddIgnorePatternCommand } from '../../../src/domains/filesystem/application/commands/add-ignore-pattern.command';
import { AddIgnorePatternHandler } from '../../../src/domains/filesystem/application/handlers/add-ignore-pattern.handler';
import { RemoveIgnorePatternCommand } from '../../../src/domains/filesystem/application/commands/remove-ignore-pattern.command';
import { RemoveIgnorePatternHandler } from '../../../src/domains/filesystem/application/handlers/remove-ignore-pattern.handler';
import { GetIgnoredFilesQuery } from '../../../src/domains/filesystem/application/queries/get-ignored-files.query';
import { GetIgnoredFilesHandler } from '../../../src/domains/filesystem/application/handlers/get-ignored-files.handler';
import { EventBus } from '../../../src/domains/shared-kernel/events/event-bus';
import { getWorkspaceContext } from './tracking/workspace-context';
import { PathUtils } from '../../../src/domains/shared-kernel/utils/path-utils'; // NEW IMPORT

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function createRepositories(rootPath: string) {
  const ctx = getWorkspaceContext();
  // FIX: Normalize rootPath before comparison
  const normalizedRoot = PathUtils.normalize(rootPath);
  if (!ctx || ctx.rootPath !== normalizedRoot) {
    throw new Error('Workspace context is not initialized or path mismatch.');
  }
  return { 
    workspaceRepo: ctx.workspaceRepo, 
    configRepo: ctx.configRepo, 
    fileSystemRepo: ctx.fileSystemRepo,
    fileWatcher: ctx.fileWatcher
  };
}

function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
    return null;
  }
  return workspaceId.trim();
}

export function registerFilesystemHandlers(): void {
  ipcMain.handle(
    IpcChannels.FILESYSTEM_GET_FILE_TREE,
    async (_event, workspaceId: unknown, parentPath?: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };

      try {
        const { fileSystemRepo } = createRepositories(rootPath);
        const handler = new GetFileTreeHandler(fileSystemRepo);
        const result = await handler.execute(new GetFileTreeQuery(PathUtils.normalize(rootPath), parentPath));

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
    IpcChannels.FILESYSTEM_ADD_IGNORE_PATTERN,
    async (_event, workspaceId: unknown, pattern: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };

      try {
        const { configRepo, fileSystemRepo, fileWatcher } = createRepositories(rootPath);
        const handler = new AddIgnorePatternHandler(configRepo, fileSystemRepo, fileWatcher, EventBus.getInstance());
        const result = await handler.execute(new AddIgnorePatternCommand(PathUtils.normalize(rootPath), pattern));

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
    IpcChannels.FILESYSTEM_REMOVE_IGNORE_PATTERN,
    async (_event, workspaceId: unknown, pattern: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };

      try {
        const { configRepo, fileWatcher } = createRepositories(rootPath);
        const handler = new RemoveIgnorePatternHandler(configRepo, fileWatcher, EventBus.getInstance());
        const result = await handler.execute(new RemoveIgnorePatternCommand(PathUtils.normalize(rootPath), pattern));

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
    IpcChannels.FILESYSTEM_GET_IGNORED_FILES,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) return { success: false, error: 'Invalid workspace ID' };

      try {
        const { configRepo } = createRepositories(rootPath);
        const handler = new GetIgnoredFilesHandler(configRepo);
        const result = await handler.execute(new GetIgnoredFilesQuery(PathUtils.normalize(rootPath)));

        return result.fold<IpcResponse<unknown>>(
          (patterns) => ({ success: true, data: patterns }),
          (error) => ({ success: false, error })
        );
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );
}