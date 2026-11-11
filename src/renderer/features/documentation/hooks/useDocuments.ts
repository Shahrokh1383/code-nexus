import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DOCUMENTATION_CHANNELS } from '@shared/ipc/documentation';
import type { DocumentDto, GetAllDocumentsResponse } from '@shared/ipc/documentation';
import { useWorkspace } from '../../workspace';
import { invokeIpc } from '../api/documentationIpc';
import { documentationKeys } from '../keys';
import { TREE_UPDATED_CHANNEL } from '../../filesystem/keys';
import { onIpcEvent } from '../../../shared/lib/ipc';

const FETCH_FAILED = 'Failed to fetch';
const ORPHANS_FAILED = 'Failed to fetch orphans';
const DELETED_FAILED = 'Failed to fetch deleted';
const REGISTER_FAILED = 'Failed to register';
const SOFT_DELETE_FAILED = 'Failed to delete';
const PERMANENT_DELETE_FAILED = 'Failed to permanently delete';
const RESTORE_FAILED = 'Failed to restore';

function toError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

/**
 * Documentation feature data hook. Owns every IPC call and all list-update
 * semantics; the page only composes. Ported verbatim from the legacy
 * documentation.store + useDocuments: the sync-then-fetch read model, the
 * O(1) list moves on delete/restore (no refetch), the register-refetch set,
 * the dismissable error banner and the confirm dialog texts.
 */
export function useDocuments() {
  const { workspace } = useWorkspace();
  const wid = workspace?.id ?? '';

  const queryClient = useQueryClient();
  const documentsKey = documentationKeys.documents(wid);
  const orphansKey = documentationKeys.orphans(wid);
  const deletedKey = documentationKeys.deleted(wid);

  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [dismissedError, setDismissedError] = useState<unknown>(null);

  // Filesystem tree updates fire on both add and remove (via the filesystem
  // module's RendererBridge). Invalidate the three documentation queries so
  // DocumentManagerPage reflects disk-level changes without a manual refresh.
  // Sequential to preserve the sync-then-fetch invariant of documentsQuery
  // (SYNC_FILES runs inside its queryFn and must complete before orphans/
  // deleted reads — matches the mount-time ordering).
  useEffect(() => {
    if (wid === '') return;
    const unsubscribe = onIpcEvent(TREE_UPDATED_CHANNEL, () => {
      void (async () => {
        await queryClient.invalidateQueries({ queryKey: documentationKeys.documents(wid) });
        await queryClient.invalidateQueries({ queryKey: documentationKeys.orphans(wid) });
        await queryClient.invalidateQueries({ queryKey: documentationKeys.deleted(wid) });
      })();
    });
    return unsubscribe;
  }, [queryClient, wid]);

  // Legacy fetchDocumentation ran SYNC_FILES before GET_ALL — the list was
  // always post-sync. Preserved verbatim. Orphans ran after it in the store;
  // here they are a sibling query (idempotent read, same rendered result).
  const documentsQuery = useQuery({
    queryKey: documentsKey,
    queryFn: async () => {
      try {
        await invokeIpc<void>(DOCUMENTATION_CHANNELS.SYNC_FILES, { workspaceId: wid });
        return await invokeIpc<GetAllDocumentsResponse>(DOCUMENTATION_CHANNELS.GET_ALL, {
          workspaceId: wid,
        });
      } catch (error) {
        throw toError(error, FETCH_FAILED);
      }
    },
    enabled: wid !== '',
    staleTime: 0, // every mount refetches — legacy refetched on every page visit
    retry: false, // legacy: single attempt
    refetchOnWindowFocus: false, // legacy had no focus refetch
  });

  const orphansQuery = useQuery({
    queryKey: orphansKey,
    queryFn: async () => {
      try {
        return await invokeIpc<DocumentDto[]>(DOCUMENTATION_CHANNELS.GET_ORPHANED, {
          workspaceId: wid,
        });
      } catch (error) {
        throw toError(error, ORPHANS_FAILED);
      }
    },
    enabled: wid !== '',
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const deletedQuery = useQuery({
    queryKey: deletedKey,
    queryFn: async () => {
      try {
        return await invokeIpc<DocumentDto[]>(DOCUMENTATION_CHANNELS.GET_DELETED, {
          workspaceId: wid,
        });
      } catch (error) {
        throw toError(error, DELETED_FAILED);
      }
    },
    enabled: wid !== '',
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const registerFolderMutation = useMutation({
    mutationFn: async (suggestedPath?: string) => {
      if (wid === '') return;
      await invokeIpc<void>(DOCUMENTATION_CHANNELS.REGISTER_FOLDER, {
        workspaceId: wid,
        suggestedPath,
      });
    },
    onMutate: () => setMutationError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentsKey });
      void queryClient.invalidateQueries({ queryKey: orphansKey });
    },
    onError: (error) => setMutationError(toError(error, REGISTER_FAILED)),
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (wid === '') return;
      await invokeIpc<void>(DOCUMENTATION_CHANNELS.SOFT_DELETE_DOCUMENT, {
        workspaceId: wid,
        documentId,
      });
    },
    onSuccess: (_data, documentId) => {
      const doc =
        queryClient.getQueryData<GetAllDocumentsResponse>(documentsKey)?.documents.find(
          (d) => d.id === documentId
        ) ??
        queryClient.getQueryData<DocumentDto[]>(orphansKey)?.find((d) => d.id === documentId);
      if (!doc) return;

      queryClient.setQueryData<GetAllDocumentsResponse>(documentsKey, (old) =>
        old ? { ...old, documents: old.documents.filter((d) => d.id !== documentId) } : old
      );
      queryClient.setQueryData<DocumentDto[]>(orphansKey, (old) =>
        old ? old.filter((d) => d.id !== documentId) : old
      );
      queryClient.setQueryData<DocumentDto[]>(deletedKey, (old) => (old ? [...old, doc] : [doc]));
    },
    onError: (error) => setMutationError(toError(error, SOFT_DELETE_FAILED)),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (wid === '') return;
      await invokeIpc<void>(DOCUMENTATION_CHANNELS.PERMANENT_DELETE_DOCUMENT, {
        workspaceId: wid,
        documentId,
      });
    },
    onSuccess: (_data, documentId) => {
      queryClient.setQueryData<DocumentDto[]>(deletedKey, (old) =>
        old ? old.filter((d) => d.id !== documentId) : old
      );
    },
    onError: (error) => setMutationError(toError(error, PERMANENT_DELETE_FAILED)),
  });

  const restoreMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (wid === '') return;
      await invokeIpc<void>(DOCUMENTATION_CHANNELS.RESTORE_DOCUMENT, {
        workspaceId: wid,
        documentId,
      });
    },
    onSuccess: (_data, documentId) => {
      const doc = queryClient.getQueryData<DocumentDto[]>(deletedKey)?.find(
        (d) => d.id === documentId
      );
      if (!doc) return;

      queryClient.setQueryData<DocumentDto[]>(deletedKey, (old) =>
        old ? old.filter((d) => d.id !== documentId) : old
      );
      if (doc.isOrphaned) {
        queryClient.setQueryData<DocumentDto[]>(orphansKey, (old) => (old ? [...old, doc] : [doc]));
      } else {
        queryClient.setQueryData<GetAllDocumentsResponse>(documentsKey, (old) =>
          old ? { ...old, documents: [...old.documents, doc] } : old
        );
      }
    },
    onError: (error) => setMutationError(toError(error, RESTORE_FAILED)),
  });

  const documents = documentsQuery.data?.documents ?? [];
  const docFolder = documentsQuery.data?.docFolder ?? null;
  const orphans = orphansQuery.data ?? [];
  const deletedDocuments = deletedQuery.data ?? [];

  const isLoading = documentsQuery.isFetching || registerFolderMutation.isPending;

  const activeError: Error | null =
    documentsQuery.error ?? orphansQuery.error ?? deletedQuery.error ?? mutationError;
  const error =
    activeError !== null && activeError !== dismissedError && !documentsQuery.isFetching
      ? activeError instanceof Error
        ? activeError.message
        : String(activeError)
      : null;

  const clearError = useCallback(() => setDismissedError(activeError), [activeError]);

  const registerFolder = useCallback(
    async (suggestedPath?: string) => {
      await registerFolderMutation.mutateAsync(suggestedPath).catch(() => undefined);
    },
    [registerFolderMutation]
  );

  const handleSoftDelete = useCallback(
    async (id: string) => {
      if (window.confirm('Move this document to trash? It can be restored later.')) {
        await softDeleteMutation.mutateAsync(id).catch(() => undefined);
      }
    },
    [softDeleteMutation]
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      if (window.confirm('Permanently delete this document? This action cannot be undone.')) {
        await permanentDeleteMutation.mutateAsync(id).catch(() => undefined);
      }
    },
    [permanentDeleteMutation]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      await restoreMutation.mutateAsync(id).catch(() => undefined);
    },
    [restoreMutation]
  );

  return {
    documents, docFolder, orphans, deletedDocuments, isLoading, error,
    registerFolder,
    softDeleteDocument: handleSoftDelete,
    permanentDeleteDocument: handlePermanentDelete,
    restoreDocument: handleRestore,
    clearError,
  };
}