import { IpcChannels } from '../../electron/ipc/channels';

export interface ElectronAPI {
  send: (channel: IpcChannels, ...args: unknown[]) => void;
  invoke: (channel: IpcChannels, ...args: unknown[]) => Promise<unknown>;
  on: (channel: IpcChannels, callback: (...args: unknown[]) => void) => (() => void);
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}