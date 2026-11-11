import { useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LINKING_CHANNELS } from '@shared/ipc/linking';
import { useWorkspace } from '../../workspace';
import { invokeIpc } from '../api/linkingIpc';
import { linkingKeys } from '../keys';
import { useCodeLinksQuery } from './useLinks';
import { TREE_UPDATED_CHANNEL } from '../../filesystem/keys';
import { onIpcEvent } from '../../../shared/lib/ipc';

export function useLinkedFiles(documentId: string | null) {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const queryClient = useQueryClient();

  const codeLinksQuery = useCodeLinksQuery(wid, documentId);

  useEffect(() => {
    if (wid === '') return;
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      void queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, documentId ?? ''),
      });
    });
    return unsubscribe;
  }, [queryClient, wid, documentId]);

  useEffect(() => {
    if (wid === '') return;
    const unsubscribe = onIpcEvent(LINKING_CHANNELS.UPDATED, () => {
      void queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, documentId ?? ''),
      });
    });
    return unsubscribe;
  }, [queryClient, wid, documentId]);

  const removeCodeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.REMOVE_LINK, {
        workspaceId: wid,
        linkId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      if (documentId) {
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.codeLinks(wid, documentId),
        });
      }
    },
  });

  // Cache is partitioned by (wid, codeLinks, documentId); the query returns
  // links for exactly the requested document. No client-side filter needed.
  const codeLinks = documentId ? codeLinksQuery.data ?? [] : [];

  const removeLink = useCallback(
    async (linkId: string) => {
      await removeCodeLinkMutation.mutateAsync(linkId).catch(() => undefined);
    },
    [removeCodeLinkMutation]
  );

  return {
    codeLinks,
    removeLink,
  };
}