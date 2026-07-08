import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels } from './ipc/channels';

const ipcApi = {
  send: (channel: IpcChannels, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args);
  },
  invoke: (channel: IpcChannels, ...args: unknown[]): Promise<unknown> => {
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: IpcChannels, callback: (...args: unknown[]) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(...args);
    };
    ipcRenderer.on(channel, subscription);
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', ipcApi);

export type IpcApi = typeof ipcApi;
