import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '../stores/workspace.store';
import { useIpc } from './useIpc';
import { IpcChannels } from '../../../electron/ipc/channels';
import { WorkspaceDto } from '../../domains/project/application/dto/workspace.dto';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const STORAGE_KEY = 'codenexus_active_workspace_id';

export function useWorkspace() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { workspace, setWorkspace, clearWorkspace } = useWorkspaceStore();
  const ipc = useIpc();

  const initialize = useCallback(
    async (rootPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = (await ipc.invoke(
          IpcChannels.PROJECT_INITIALIZE,
          rootPath
        )) as IpcResponse<WorkspaceDto>;

        if (response.success && response.data) {
          localStorage.setItem(STORAGE_KEY, response.data.id);
          setWorkspace(response.data);
        } else {
          setError(response.error || 'Failed to initialize workspace');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [ipc, setWorkspace]
  );

  const closeWorkspace = useCallback(async () => {
    if (!workspace) return;

    try {
      await ipc.invoke(IpcChannels.PROJECT_CLOSE, workspace.id);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      clearWorkspace();
    }
  }, [workspace, ipc, clearWorkspace]);

  const rehydrate = useCallback(async () => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) return;

    try {
      const response = (await ipc.invoke(
        IpcChannels.PROJECT_GET_WORKSPACE,
        storedId
      )) as IpcResponse<WorkspaceDto>;

      if (response.success && response.data) {
        setWorkspace(response.data);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        clearWorkspace();
      }
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      clearWorkspace();
    }
  }, [ipc, setWorkspace, clearWorkspace]);

  return {
    initialize,
    closeWorkspace,
    rehydrate,
    workspace,
    isLoading,
    error,
  };
}