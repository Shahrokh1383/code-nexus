import type { IpcChannel } from '@shared/ipc/channels';
import type { IpcResponse } from '@shared/ipc/envelope';

/**
 * Typed IPC invoke for the linking feature. Mirrors the documentation
 * feature's invokeIpc contract exactly: unwraps the envelope, throws the
 * backend's user-facing message (or code as fallback) on failure.
 */
export async function invokeIpc<T>(channel: IpcChannel, payload?: unknown): Promise<T> {
  const response = (await window.api.invoke(channel, payload)) as IpcResponse<T>;

  if (!response.ok) {
    const error = response.error as { code: string; message?: string };
    throw new Error(error.message ?? error.code);
  }
  return response.data;
}