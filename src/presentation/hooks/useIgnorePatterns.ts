import { useCallback } from 'react';
import { useFileSystemStore } from '../stores/filesystem.store';
import { useIpc } from './useIpc';
import { useWorkspaceStore } from '../stores/workspace.store';
import { IpcChannels } from '../../../electron/ipc/channels';

interface IpcResponse<T> { success: boolean; data?: T; error?: string; }

export function useIgnorePatterns() {
  const ipc = useIpc();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { ignoredPatterns, setIgnoredPatterns, addIgnoredPattern, removeIgnoredPattern, setError } = useFileSystemStore();

  const fetchPatterns = useCallback(async () => {
    if (!workspace) return;
    const res = await ipc.invoke(IpcChannels.FILESYSTEM_GET_IGNORED_FILES, workspace.id) as IpcResponse<string[]>;
    if (res.success && res.data) setIgnoredPatterns(res.data);
  }, [workspace, ipc, setIgnoredPatterns]);

  const addPattern = useCallback(async (pattern: string) => {
    if (!workspace) return;
    const res = await ipc.invoke(IpcChannels.FILESYSTEM_ADD_IGNORE_PATTERN, workspace.id, pattern) as IpcResponse<void>;
    if (res.success) addIgnoredPattern(pattern);
    else setError(res.error || 'Failed to add pattern');
  }, [workspace, ipc, addIgnoredPattern, setError]);

  const removePattern = useCallback(async (pattern: string) => {
    if (!workspace) return;
    const res = await ipc.invoke(IpcChannels.FILESYSTEM_REMOVE_IGNORE_PATTERN, workspace.id, pattern) as IpcResponse<void>;
    if (res.success) removeIgnoredPattern(pattern);
    else setError(res.error || 'Failed to remove pattern');
  }, [workspace, ipc, removeIgnoredPattern, setError]);

  return { ignoredPatterns, fetchPatterns, addPattern, removePattern };
}