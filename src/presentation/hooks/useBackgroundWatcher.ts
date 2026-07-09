import { useEffect } from 'react';
import { useIpc } from './useIpc';
import { IpcChannels } from '../../../electron/ipc/channels';
import { useFileSystemStore } from '../stores/filesystem.store';

interface WatcherEvent {
  eventName: 'FileModified' | 'FileDiscovered' | 'FileDeleted';
  payload: { path: string };
}

export function useBackgroundWatcher() {
  const ipc = useIpc();
  const markChanged = useFileSystemStore((s) => s.markChanged);

  useEffect(() => {
    const unsubscribe = ipc.on(IpcChannels.FILESYSTEM_WATCH, (...args: unknown[]) => {
      const event = args[0] as WatcherEvent;
      if (event?.eventName === 'FileModified' && event.payload?.path) {
        markChanged(event.payload.path);
      }
    });

    return () => { unsubscribe(); };
  }, [ipc, markChanged]);
}