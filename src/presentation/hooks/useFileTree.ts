import { useCallback } from 'react';
import { useFileSystemStore } from '../stores/filesystem.store';
import { useIpc } from './useIpc';
import { useWorkspaceStore } from '../stores/workspace.store';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileTreeDto } from '../../domains/filesystem/application/dto/file-tree.dto';

interface IpcResponse<T> { success: boolean; data?: T; error?: string; }

export function useFileTree() {
  const ipc = useIpc();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { setTree, setScanning, setError, tree, isScanning, totalFiles, totalFolders, error } = useFileSystemStore();

  const scanProject = useCallback(async () => {
    if (!workspace) return;
    setScanning(true);
    setError(null);
    try {
      const res = await ipc.invoke(IpcChannels.FILESYSTEM_SCAN_PROJECT, workspace.id) as IpcResponse<FileTreeDto>;
      if (res.success && res.data) setTree(res.data);
      else setError(res.error || 'Scan failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setScanning(false);
    }
  }, [workspace, ipc, setTree, setScanning, setError]);

  return { scanProject, tree, isScanning, totalFiles, totalFolders, error };
}