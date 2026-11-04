import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LINKING_CHANNELS } from '@shared/ipc/linking';
import { useWorkspace } from '../../workspace';
import { invokeIpc } from '../api/linkingIpc';
import { linkingKeys } from '../keys';

export function useLinkCreation(onSuccess: () => void) {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const queryClient = useQueryClient();

  const bulkCodeLinksMutation = useMutation({
    mutationFn: async (input: { codeFileIds: string[]; documentId: string }) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.CREATE_BULK_CODE_LINKS, {
        workspaceId: wid,
        codeFileIds: input.codeFileIds,
        documentId: input.documentId,
      });
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      void queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, input.documentId),
      });
    },
  });

  const createDocumentLinkMutation = useMutation({
    mutationFn: async (input: { parentDocumentId: string; childDocumentId: string }) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.CREATE_DOCUMENT_LINK, {
        workspaceId: wid,
        parentDocumentId: input.parentDocumentId,
        childDocumentId: input.childDocumentId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
    },
  });

  const handleModalLink = useCallback(
    async (
      sourceIds: string[],
      targetDocumentId: string,
      sourceType: 'code' | 'document'
    ) => {
      if (sourceType === 'code') {
        await bulkCodeLinksMutation
          .mutateAsync({ codeFileIds: sourceIds, documentId: targetDocumentId })
          .catch(() => undefined);
      } else {
        // Sequential by design (DI-13) — no bulk document-link API.
        for (const id of sourceIds) {
          await createDocumentLinkMutation
            .mutateAsync({ parentDocumentId: targetDocumentId, childDocumentId: id })
            .catch(() => undefined);
        }
      }
      onSuccess();
    },
    [bulkCodeLinksMutation, createDocumentLinkMutation, onSuccess]
  );

  return { handleModalLink };
}