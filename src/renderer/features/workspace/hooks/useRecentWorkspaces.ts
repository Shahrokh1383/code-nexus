import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecentWorkspaceDto } from '@shared/ipc/workspace';
import { workspaceApi } from '../api/workspaceIpc';
import { workspaceKeys } from '../keys';

/**
 * Recent workspaces list + removal. Cache updates mirror the legacy local
 * state updates (optimistic filter on remove).
 */
export function useRecentWorkspaces() {
  const queryClient = useQueryClient();

  const recentsQuery = useQuery({
    queryKey: workspaceKeys.recents,
    queryFn: () => workspaceApi.getRecentWorkspaces(),
  });

  const removeRecent = useMutation({
    mutationFn: (workspaceId: string) => workspaceApi.removeRecentWorkspace(workspaceId),
    onSuccess: (_data, workspaceId) => {
      queryClient.setQueryData<RecentWorkspaceDto[]>(workspaceKeys.recents, (prev) =>
        (prev ?? []).filter((r) => r.id !== workspaceId)
      );
    },
  });

  const fetchRecents = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: workspaceKeys.recents });
  }, [queryClient]);

  return {
    recents: recentsQuery.data ?? [],
    isLoading: recentsQuery.isLoading,
    fetchRecents,
    removeRecent: (workspaceId: string) => removeRecent.mutateAsync(workspaceId),
  };
}