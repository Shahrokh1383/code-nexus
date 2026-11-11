import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LINKING_CHANNELS } from '@shared/ipc/linking';
import type {
  CodeToDocLinkDto,
  DocumentLinkDto,
  CodeFileSummaryDto,
} from '@shared/ipc/linking';
import { useWorkspace } from '../../workspace';
import { invokeIpc } from '../api/linkingIpc';
import { linkingKeys } from '../keys';
import { useSelectedDocId } from '../stores/selectedDocument';
import { TREE_UPDATED_CHANNEL } from '../../filesystem/keys';
import { onIpcEvent } from '../../../shared/lib/ipc';

const FETCH_FAILED = 'Failed to fetch linking data';
const REMOVE_DOC_LINK_FAILED = 'Failed to remove document link';

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

export function useUnlinkedCodeFilesQuery(wid: string) {
  return useQuery({
    queryKey: linkingKeys.unlinked(wid),
    queryFn: async () => {
      try {
        return await invokeIpc<CodeFileSummaryDto[]>(
          LINKING_CHANNELS.GET_UNLINKED_CODEFILES,
          { workspaceId: wid }
        );
      } catch (error) {
        throw toError(error, FETCH_FAILED);
      }
    },
    enabled: wid !== '',
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCodeLinksQuery(wid: string, docId: string | null) {
  return useQuery({
    queryKey: linkingKeys.codeLinks(wid, docId ?? ''),
    queryFn: async () => {
      try {
        return await invokeIpc<CodeToDocLinkDto[]>(
          LINKING_CHANNELS.GET_LINKS_FOR_DOCUMENT,
          { workspaceId: wid, documentId: docId ?? '' }
        );
      } catch (error) {
        throw toError(error, 'Failed to fetch document links');
      }
    },
    enabled: wid !== '' && docId !== null,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useDocumentLinksQuery(wid: string, docId: string | null) {
  return useQuery({
    queryKey: linkingKeys.documentLinks(wid, docId ?? ''),
    queryFn: async () => {
      try {
        const parents = await invokeIpc<DocumentLinkDto[]>(
          LINKING_CHANNELS.GET_DOCUMENT_PARENTS,
          { workspaceId: wid, childDocumentId: docId ?? '' }
        );
        const children = await invokeIpc<DocumentLinkDto[]>(
          LINKING_CHANNELS.GET_DOCUMENT_CHILDREN,
          { workspaceId: wid, parentDocumentId: docId ?? '' }
        );
        return [...parents, ...children];
      } catch (error) {
        throw toError(error, 'Failed to fetch document links');
      }
    },
    enabled: wid !== '' && docId !== null,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useLinks() {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';
  const selectedDocId = useSelectedDocId();
  const queryClient = useQueryClient();

  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [dismissedError, setDismissedError] = useState<unknown>(null);

  const unlinkedQuery = useUnlinkedCodeFilesQuery(wid);
  const codeLinksQuery = useCodeLinksQuery(wid, selectedDocId);
  const documentLinksQuery = useDocumentLinksQuery(wid, selectedDocId);

  // Filesystem-driven reconcile: backend LinkReconciler cleans dead
  // code links on every disk event; filesystem:tree-updated (300 ms
  // debounce) is the "reconcile finished" proxy.
  useEffect(() => {
    if (wid === '') return;
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      if (selectedDocId) {
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.codeLinks(wid, selectedDocId),
        });
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.documentLinks(wid, selectedDocId),
        });
      }
    });
    return unsubscribe;
  }, [queryClient, wid, selectedDocId]);

  // Link-mutation-driven reconcile: DocumentLinkCreated/Broken and
  // LinkCreated/Broken fire on IPC mutations; the backend bridge coalesces
  // them into a single 'linking:updated' push so the hierarchy tab and
  // linked files update without manual refresh.
  useEffect(() => {
    if (wid === '') return;
    const unsubscribe = onIpcEvent(LINKING_CHANNELS.UPDATED, () => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      if (selectedDocId) {
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.codeLinks(wid, selectedDocId),
        });
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.documentLinks(wid, selectedDocId),
        });
      }
    });
    return unsubscribe;
  }, [queryClient, wid, selectedDocId]);

  const removeDocumentLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      if (wid === '') return;
      await invokeIpc<void>(LINKING_CHANNELS.REMOVE_DOCUMENT_LINK, {
        workspaceId: wid,
        linkId,
      });
    },
    onMutate: () => setMutationError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
      if (selectedDocId) {
        void queryClient.invalidateQueries({
          queryKey: linkingKeys.documentLinks(wid, selectedDocId),
        });
      }
    },
    onError: (error) => setMutationError(toError(error, REMOVE_DOC_LINK_FAILED)),
  });

  const fetchGraphData = useCallback(async () => {
    if (wid === '') return;
    await queryClient.invalidateQueries({ queryKey: linkingKeys.unlinked(wid) });
  }, [wid, queryClient]);

  const fetchLinksForDocument = useCallback(
    async (documentId: string) => {
      if (wid === '') return;
      await queryClient.invalidateQueries({
        queryKey: linkingKeys.codeLinks(wid, documentId),
      });
      await queryClient.invalidateQueries({
        queryKey: linkingKeys.documentLinks(wid, documentId),
      });
    },
    [wid, queryClient]
  );

  const removeDocumentLink = useCallback(
    async (linkId: string) => {
      await removeDocumentLinkMutation.mutateAsync(linkId).catch(() => undefined);
    },
    [removeDocumentLinkMutation]
  );

  const activeError: Error | null = unlinkedQuery.error ?? mutationError;
  const error =
    activeError !== null && activeError !== dismissedError
      ? activeError instanceof Error
        ? activeError.message
        : String(activeError)
      : null;

  const clearError = useCallback(() => setDismissedError(activeError), [activeError]);

  return {
    codeLinks: codeLinksQuery.data ?? [],
    documentLinks: documentLinksQuery.data ?? [],
    unlinkedFiles: unlinkedQuery.data ?? [],
    isLoading: unlinkedQuery.isFetching,
    error,
    clearError,
    fetchGraphData,
    fetchLinksForDocument,
    removeDocumentLink,
  };
}