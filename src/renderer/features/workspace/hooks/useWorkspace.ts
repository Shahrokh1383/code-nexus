import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WorkspaceDto } from '@shared/ipc/workspace';
import { workspaceApi } from '../api/workspaceIpc';
import { workspaceKeys } from '../keys';
import { useFileSystemStore } from '../../filesystem/stores/filesystem.store';

const ACTIVE_WORKSPACE_STORAGE_KEY = 'codenexus_active_workspace_id';

function readStoredWorkspaceId(): string | null {
  return localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

async function fetchActiveWorkspace(): Promise<WorkspaceDto | null> {
  const storedId = readStoredWorkspaceId();
  if (!storedId) {
    return null;
  }
  try {
    return await workspaceApi.getWorkspace(storedId);
  } catch {
    // Rehydration failure clears the stored selection, like the legacy hook.
    localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    return null;
  }
}

/**
 * Active workspace state + lifecycle mutations. Replaces the legacy
 * workspace store + useWorkspace hook; the React Query cache is the store.
 */
export function useWorkspace() {
  const queryClient = useQueryClient();

  const activeQuery = useQuery({
    queryKey: workspaceKeys.active,
    queryFn: fetchActiveWorkspace,
    staleTime: Infinity,
  });

  const persistActive = useCallback(
    (workspace: WorkspaceDto) => {
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspace.id);
      queryClient.setQueryData(workspaceKeys.active, workspace);
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.recents });
    },
    [queryClient]
  );

  const purgeAllState = useCallback(() => {
    useFileSystemStore.getState().reset();
    queryClient.clear();
  }, [queryClient]);

  const initialize = useMutation({
    mutationFn: (rootPath: string) => workspaceApi.initialize(rootPath),
    onSuccess: persistActive,
  });

  const switchWorkspace = useMutation({
    mutationFn: async (rootPath: string) => {
      // Purge all frontend state immediately to prevent data leaks.
      purgeAllState();
      return workspaceApi.initialize(rootPath);
    },
    onSuccess: persistActive,
  });

  const closeWorkspace = useMutation({
    mutationFn: (workspaceId: string) => workspaceApi.closeWorkspace(workspaceId),
    onSettled: () => {
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      purgeAllState();
    },
  });

  const workspace = activeQuery.data ?? null;

  return {
    workspace,
    isBootstrapping: activeQuery.isLoading,
    isLoading: initialize.isPending || switchWorkspace.isPending,
    error:
      initialize.error && initialize.error instanceof Error
        ? initialize.error.message
        : switchWorkspace.error && switchWorkspace.error instanceof Error
          ? switchWorkspace.error.message
          : null,
    initialize: (rootPath: string) => initialize.mutateAsync(rootPath),
    switchWorkspace: (rootPath: string) => switchWorkspace.mutateAsync(rootPath),
    closeWorkspace: async (workspaceId: string) => {
      await closeWorkspace.mutateAsync(workspaceId).catch(() => undefined);
    },
  };
}