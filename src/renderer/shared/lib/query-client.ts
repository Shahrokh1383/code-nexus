import { QueryClient } from '@tanstack/react-query';

/**
 * Single React Query client. IPC calls are single-attempt by design in this
 * app (the legacy hooks never retried), so retry is off and focus refetching
 * is disabled for the Electron shell.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
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
}