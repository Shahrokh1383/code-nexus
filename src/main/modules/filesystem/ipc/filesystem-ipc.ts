import { FILESYSTEM_CHANNELS } from '@shared/ipc/filesystem';
import type { ServiceContainer } from '../../../kernel/service-container';
import type { Logger } from '../../../shared/logger/logger';
import { createIpcHandler } from '../../../shared/ipc/handler';
import { FileSystemServiceToken } from '../services/contracts/FileSystemServiceContract';
import {
  getFileTreeSchema,
  addIgnorePatternSchema,
  removeIgnorePatternSchema,
  getIgnoredFilesSchema,
} from './schemas';

/**
 * Thin file-system IPC registration (Constitution §11).
 */
export function registerFilesystemIpc(container: ServiceContainer, logger: Logger): void {
  const service = () => container.resolve(FileSystemServiceToken);

  createIpcHandler(logger, {
    channel: FILESYSTEM_CHANNELS.GET_FILE_TREE,
    schema: getFileTreeSchema,
    execute: ({ workspaceId, parentPath }) => service().getFileTree(workspaceId, parentPath),
  });

  createIpcHandler(logger, {
    channel: FILESYSTEM_CHANNELS.ADD_IGNORE_PATTERN,
    schema: addIgnorePatternSchema,
    execute: ({ workspaceId, pattern }) => service().addIgnorePattern(workspaceId, pattern),
  });

  createIpcHandler(logger, {
    channel: FILESYSTEM_CHANNELS.REMOVE_IGNORE_PATTERN,
    schema: removeIgnorePatternSchema,
    execute: ({ workspaceId, pattern }) => service().removeIgnorePattern(workspaceId, pattern),
  });

  createIpcHandler(logger, {
    channel: FILESYSTEM_CHANNELS.GET_IGNORED_FILES,
    schema: getIgnoredFilesSchema,
    execute: ({ workspaceId }) => service().getIgnoredFiles(workspaceId),
  });
}