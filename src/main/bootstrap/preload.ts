import { contextBridge, ipcRenderer } from 'electron';
import { ALL_IPC_CHANNELS, EVENT_CHANNELS } from '@shared/ipc/channels';
import type { PreloadApi } from '@shared/ipc/api';

const invokeAllowList = new Set<string>(ALL_IPC_CHANNELS);
const eventAllowList = new Set<string>(EVENT_CHANNELS);

/**
 * Secure preload bridge: only whitelisted channels,
 * typed invoke, event subscription limited to push channels. No Node APIs,
 * no Electron internals, no generic pass-through.
 */
const api: PreloadApi = {
  invoke: (channel, payload) => {
    if (!invokeAllowList.has(channel)) {
      return Promise.reject(new Error(`IPC channel is not allowed: ${channel}`));
    }
    return ipcRenderer.invoke(channel, payload);
  },
  on: (channel, callback) => {
    if (!eventAllowList.has(channel)) {
      throw new Error(`IPC event channel is not allowed: ${channel}`);
    }
    const listener = (): void => {
      callback();
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);