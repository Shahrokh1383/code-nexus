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
      clearWorkspace();
    }
  }, [workspace, ipc, clearWorkspace]);

  return {
    initialize,
    closeWorkspace,
    workspace,
    isLoading,
    error,
  };
}