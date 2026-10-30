import type { IpcChannel } from '@shared/ipc/channels';
import type { IpcResponse } from '@shared/ipc/envelope';

/**
 * Typed IPC invoke for the documentation feature: calls the preload bridge
 * and unwraps the standard envelope, throwing the backend's user-facing
 * message on failure (error.message when present, error.code otherwise).
 */
export async function invokeIpc<T>(channel: IpcChannel, payload?: unknown): Promise<T> {
  const response = (await window.api.invoke(channel, payload)) as IpcResponse<T>;

  if (!response.ok) {
    const error = response.error as { code: string; message?: string };
    throw new Error(error.message ?? error.code);
  }
  return response.data;
}