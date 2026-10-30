import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { filesystemApi } from '../api/filesystemIpc';
import { filesystemKeys } from '../keys';
import { useWorkspace } from '../../workspace';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Ignore-pattern list + add/remove mutations. Mutations invalidate both the
 * pattern cache and the tree cache — the replacement for the legacy
 * `onPatternChange` refetch callback.
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
    void queryClient.invalidateQueries({ queryKey: filesystemKeys.all });
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