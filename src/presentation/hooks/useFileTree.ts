import { useCallback, useEffect } from 'react';
import { useFileSystemStore } from '../stores/filesystem.store';
import { useIpc } from './useIpc';
import { useWorkspaceStore } from '../stores/workspace.store';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileTreeDto } from '../../domains/filesystem/application/dto/file-tree.dto';

interface IpcResponse<T> { success: boolean; data?: T; error?: string; }

export function useFileTree() {
  const ipc = useIpc();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { setTree, setError, tree, totalFiles, totalFolders, error } = useFileSystemStore();

  const fetchFileTree = useCallback(async () => {
    if (!workspace) return;
    setError(null);
    try {
      const res = await ipc.invoke(IpcChannels.FILESYSTEM_GET_FILE_TREE, workspace.id) as IpcResponse<FileTreeDto>;
      if (res.success && res.data) {
        setTree(res.data);
      } else {
        setError(res.error || 'Failed to fetch file tree');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [workspace, ipc, setTree, setError]);

  // Listen for real-time backend updates
  useEffect(() => {
    const unsubscribe = ipc.on(IpcChannels.FILESYSTEM_TREE_UPDATED, () => {
      fetchFileTree();
    });
    return () => {
      unsubscribe();
    };
  }, [ipc, fetchFileTree]);

  return { fetchFileTree, tree, totalFiles, totalFolders, error };
}