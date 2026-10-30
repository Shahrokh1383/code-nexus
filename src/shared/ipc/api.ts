/**
 * Shape of the bridge exposed by the preload script on `window.api`.
 * Pure types only — shared by preload (main) and the renderer
 */
import type { IpcResponse } from './envelope';
import type { IpcChannel, EventChannel } from './channels';

export interface PreloadApi {
  invoke(channel: IpcChannel, payload?: unknown): Promise<unknown>;
  on(channel: EventChannel, callback: () => void): () => void;
}

export type IpcInvokeResult<T> = Promise<IpcResponse<T>>;