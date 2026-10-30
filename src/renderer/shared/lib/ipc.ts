import type { IpcChannel, EventChannel } from '@shared/ipc/channels';
import type { IpcResponse } from '@shared/ipc/envelope';

/**
 * Feature API clients build on this single typed invoke wrapper: it unwraps
 * the standard envelope and turns failures into thrown Errors so React Query
 * can own the error state.
 */
export async function ipcInvoke<T>(channel: IpcChannel, payload?: unknown): Promise<T> {
  const response = (await window.api.invoke(channel, payload)) as IpcResponse<T>;
  if (!response.ok) {
    throw new Error(response.error.message);
  }
  return response.data;
}

export function onIpcEvent(channel: EventChannel, callback: () => void): () => void {
  return window.api.on(channel, callback);
}