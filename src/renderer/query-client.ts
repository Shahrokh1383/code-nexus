import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide React Query client (Constitution: React Query owns IPC state).
 * Defaults preserve legacy IPC semantics: single attempt, no refetch on
 * window focus. Queries opt into per-mount refetching via staleTime: 0,
 * matching the legacy "refetch on every page visit" behavior.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});