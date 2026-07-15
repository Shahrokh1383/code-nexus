import { ipcMain } from 'electron';
import { IpcChannels } from '../channels';
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
import { EventBus } from '../../../src/domains/shared-kernel/events/event-bus';

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

/**
 * Validates that the workspace ID (which doubles as the root path) is a non‑empty string.
 * Returns the validated string or null if invalid.
 */
function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
    return null;
  }
  return workspaceId.trim();
}

export function registerFilesystemHandlers(): void {
  // ── SCAN PROJECT ──────────────────────────────────
  ipcMain.handle(
    IpcChannels.FILESYSTEM_SCAN_PROJECT,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { workspaceRepo, configRepo, fileSystemRepo } = createRepositories(rootPath);
        const fileSystemAdapter = new NodeFsAdapter();
        const handler = new ScanProjectHandler(workspaceRepo, configRepo, fileSystemRepo, fileSystemAdapter);

        const result = await handler.execute(new ScanProjectCommand(workspaceId as string));

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

  // ── GET FILE TREE ─────────────────────────────────
  ipcMain.handle(
    IpcChannels.FILESYSTEM_GET_FILE_TREE,
    async (_event, workspaceId: unknown, parentPath?: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { fileSystemRepo } = createRepositories(rootPath);
        const handler = new GetFileTreeHandler(fileSystemRepo);

        const result = await handler.execute(new GetFileTreeQuery(workspaceId as string, parentPath));

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

  // ── ADD IGNORE PATTERN ────────────────────────────
  ipcMain.handle(
    IpcChannels.FILESYSTEM_ADD_IGNORE_PATTERN,
    async (_event, workspaceId: unknown, pattern: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { configRepo, fileSystemRepo } = createRepositories(rootPath);
        const handler = new AddIgnorePatternHandler(configRepo, fileSystemRepo, EventBus.getInstance());

        const result = await handler.execute(new AddIgnorePatternCommand(workspaceId as string, pattern));

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

  // ── REMOVE IGNORE PATTERN ─────────────────────────
  ipcMain.handle(
    IpcChannels.FILESYSTEM_REMOVE_IGNORE_PATTERN,
    async (_event, workspaceId: unknown, pattern: string): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { configRepo } = createRepositories(rootPath);
        const handler = new RemoveIgnorePatternHandler(configRepo, EventBus.getInstance());

        const result = await handler.execute(new RemoveIgnorePatternCommand(workspaceId as string, pattern));

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

  // ── GET IGNORED FILES ─────────────────────────────
  ipcMain.handle(
    IpcChannels.FILESYSTEM_GET_IGNORED_FILES,
    async (_event, workspaceId: unknown): Promise<IpcResponse<unknown>> => {
      const rootPath = validateWorkspaceId(workspaceId);
      if (!rootPath) {
        return { success: false, error: 'Invalid workspace ID' };
      }

      try {
        const { configRepo } = createRepositories(rootPath);
        const handler = new GetIgnoredFilesHandler(configRepo);

        const result = await handler.execute(new GetIgnoredFilesQuery(workspaceId as string));

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