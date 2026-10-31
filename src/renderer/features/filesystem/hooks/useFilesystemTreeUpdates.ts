import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { filesystemKeys, TREE_UPDATED_CHANNEL } from '../keys';
import { onIpcEvent } from '../../../shared/lib/ipc';
import { useWorkspace } from '../../workspace';

const REFETCH_DEBOUNCE_MS = 500;

/**
 * Single realtime subscription for the filesystem feature. One listener per
 * active workspace, batched into one refetch burst per burst of file events.
 * Mount once per page displaying filesystem data; do NOT call from
 * `useFileTree` (that is the pattern this replaces).
 *
 * `type: 'active'` refetches only currently-mounted queries — expanded
 * folders. Collapsed folders stay stale until remounted, which matches
 * VS Code's explorer behaviour.
 */
export function useFilesystemTreeUpdates(): void {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace?.id ?? '';

  useEffect(() => {
    if (!workspaceId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void queryClient.refetchQueries({
          queryKey: filesystemKeys.workspace(workspaceId),
          type: 'active',
        });
      }, REFETCH_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient, workspaceId]);
}