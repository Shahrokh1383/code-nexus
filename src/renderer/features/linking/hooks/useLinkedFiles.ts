import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LINKING_CHANNELS } from '@shared/ipc/linking';
import { useWorkspace } from '../../workspace';
import { invokeIpc } from '../api/linkingIpc';
import { linkingKeys } from '../keys';
import { useCodeLinksQuery } from './useLinks';

export function useLinkedFiles(documentId: string | null) {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const queryClient = useQueryClient();

  const codeLinksQuery = useCodeLinksQuery(wid, documentId);

  const removeCodeLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.REMOVE_LINK, {
        workspaceId: wid,
        linkId,
      });
    },
    onSuccess: (_data, _linkId) => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      if (documentId) {
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.codeLinks(wid, documentId),
        });
      }
    },
  });

  const codeLinks = codeLinksQuery.data ?? [];
  const filteredLinks = documentId
    ? codeLinks.filter((link) => link.documentId === documentId)
    : [];

  const removeLink = useCallback(
    async (linkId: string, docId: string) => {
      await removeCodeLinkMutation.mutateAsync(linkId).catch(() => undefined);
      // Legacy explicitly re-invalidated codeLinks for docId here; preserved.
      void queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, docId),
      });
    },
    [removeCodeLinkMutation, queryClient, wid]
  );

  return {
    codeLinks: filteredLinks,
    removeLink,
  };
}