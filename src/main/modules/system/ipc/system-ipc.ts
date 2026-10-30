import { dialog } from 'electron';
import { SYSTEM_CHANNELS } from '@shared/ipc/system';
import type { Logger } from '../../../shared/logger/logger';
import { createIpcHandler } from '../../../shared/ipc/handler';
import { reportErrorSchema } from './schemas';

/**
 * System IPC: native folder picker + renderer error reporting.
 */
export function registerSystemIpc(logger: Logger): void {
  createIpcHandler(logger, {
    channel: SYSTEM_CHANNELS.OPEN_FOLDER,
    execute: async () => {
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      return result.canceled ? [] : result.filePaths;
    },
  });

  createIpcHandler(logger, {
    channel: SYSTEM_CHANNELS.REPORT_ERROR,
    schema: reportErrorSchema,
    execute: async ({ message, stack }) => {
      logger.error('renderer reported error', { message, stack });
    },
  });
}