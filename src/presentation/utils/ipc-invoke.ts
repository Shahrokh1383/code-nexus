import { IpcChannels } from '../../../electron/ipc/channels';

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const invokeIpc = async <T>(channel: IpcChannels, ...args: unknown[]): Promise<T> => {
  const response = (await window.electronAPI.invoke(channel, ...args)) as IpcResponse<T>;
  if (!response.success) {
    throw new Error(response.error || 'Unknown IPC error');
  }
  return response.data as T;
};