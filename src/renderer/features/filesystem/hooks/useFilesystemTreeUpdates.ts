import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { filesystemKeys, TREE_UPDATED_CHANNEL } from '../keys';
import { onIpcEvent } from '../../../shared/lib/ipc';
import { useWorkspace } from '../../workspace';

const REFETCH_DEBOUNCE_MS = 300;

/**
 * Single realtime subscription for the filesystem feature. One listener per
 * active workspace, batched into one refetch burst per burst of file events.
 */
export function useFilesystemTreeUpdates(): void {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace?.id ?? '';

  useEffect(() => {
    if (!workspaceId) return;

    const treePrefix = filesystemKeys.trees(workspaceId);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (queryClient.isFetching({ queryKey: treePrefix }) > 0) {
          return;
        }
        void queryClient.refetchQueries({ queryKey: treePrefix, type: 'active' });
      }, REFETCH_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [queryClient, workspaceId]);
}