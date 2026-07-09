import { useState, useCallback, useEffect } from 'react';
import { useIpc } from './useIpc';
import { IpcChannels } from '../../../electron/ipc/channels';

export interface RecentWorkspace {
  readonly id: string;
  readonly rootPath: string;
  readonly lastOpened: string;
}

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useRecentWorkspaces() {
  const ipc = useIpc();
  const [recents, setRecents] = useState<RecentWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = (await ipc.invoke(
        IpcChannels.PROJECT_GET_RECENT_WORKSPACES
      )) as IpcResponse<RecentWorkspace[]>;

      if (res.success && res.data) {
        setRecents(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [ipc]);

  const removeRecent = useCallback(
    async (workspaceId: string) => {
      const res = (await ipc.invoke(
        IpcChannels.PROJECT_REMOVE_RECENT_WORKSPACE,
        workspaceId
      )) as IpcResponse<void>;

      if (res.success) {
        setRecents((prev) => prev.filter((r) => r.id !== workspaceId));
      }
    },
    [ipc]
  );

  useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  return { recents, isLoading, fetchRecents, removeRecent };
}