/**
 * The single IPC response envelope for every channel
 * Main handlers return it; renderer hooks must check `ok` before reading data.
 */
export interface IpcError {
  code: string;
  message: string;
  details?: unknown;
}

export type IpcResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcError };