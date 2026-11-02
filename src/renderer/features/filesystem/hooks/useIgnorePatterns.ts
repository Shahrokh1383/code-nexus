import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesystemApi } from '../api/filesystemIpc';
import { filesystemKeys } from '../keys';
import { useWorkspace } from '../../workspace';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Ignore-pattern list + add/remove mutations.
 *
 * Invalidates BOTH patterns and trees. The tree invalidation is required
 * because adding/removing a pattern changes which directories are indexed.
 * Without it, the UI would still show ignored directories like node_modules,
 * and expanding them would trigger a heavy disk fallback in Main.
 */
export function useIgnorePatterns() {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = workspace?.id ?? '';

  const patternsQuery = useQuery({
    queryKey: filesystemKeys.patterns(workspaceId),
    enabled: workspace !== null,
    queryFn: () => filesystemApi.getIgnoredFiles(workspaceId),
  });

  const invalidateCaches = (): void => {
    void queryClient.invalidateQueries({ queryKey: filesystemKeys.patterns(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: filesystemKeys.trees(workspaceId) });
  };

  const addPattern = useMutation({
    mutationFn: (pattern: string) => filesystemApi.addIgnorePattern(workspaceId, pattern),
    onSuccess: invalidateCaches,
  });

  const removePattern = useMutation({
    mutationFn: (pattern: string) => filesystemApi.removeIgnorePattern(workspaceId, pattern),
    onSuccess: invalidateCaches,
  });

  const mutationError = addPattern.error ?? removePattern.error ?? null;

  return {
    ignoredPatterns: patternsQuery.data ?? [],
    error: mutationError ? toErrorMessage(mutationError) : null,
    addPattern: (pattern: string) => addPattern.mutateAsync(pattern),
    removePattern: (pattern: string) => removePattern.mutateAsync(pattern),
  };
}