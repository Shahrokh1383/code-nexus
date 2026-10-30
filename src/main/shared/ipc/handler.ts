import type { ZodType } from 'zod';
import { ipcMain } from 'electron';
import type { IpcChannel } from '@shared/ipc/channels';
import type { IpcResponse } from '@shared/ipc/envelope';
import type { Logger } from '../logger/logger';
import { formatIpcError } from './error-formatter';

export interface IpcHandlerOptions<TInput, TOutput> {
  readonly channel: IpcChannel;
  readonly schema?: ZodType<TInput>;
  readonly execute: (payload: TInput) => Promise<TOutput>;
}

/**
 * Common IPC handler utility: validates the payload with a
 * Zod schema typed against the shared contract, runs the thin execute
 * function (which resolves its service from the module's ServiceContainer),
 * and wraps the outcome in the standard envelope.
 */
export function createIpcHandler<TInput, TOutput>(
  logger: Logger,
  options: IpcHandlerOptions<TInput, TOutput>
): void {
  ipcMain.handle(options.channel, async (_event, payload: unknown): Promise<IpcResponse<TOutput>> => {
    const startedAt = Date.now();
    try {
      let input: TInput;
      if (options.schema) {
        const parsed = options.schema.safeParse(payload);
        if (!parsed.success) {
          const response = formatIpcError(parsed.error);
          logger.warn('ipc validation failed', { channel: options.channel });
          return response as IpcResponse<TOutput>;
        }
        input = parsed.data;
      } else {
        input = payload as TInput;
      }

      const data = await options.execute(input);
      logger.debug('ipc handled', {
        channel: options.channel,
        durationMs: Date.now() - startedAt,
      });
      return { ok: true, data };
    } catch (error) {
      const response = formatIpcError(error);
      logger.error('ipc handler failed', {
        channel: options.channel,
        code: response.ok ? 'UNKNOWN' : response.error.code,
        durationMs: Date.now() - startedAt,
      });
      return response as IpcResponse<TOutput>;
    }
  });
}