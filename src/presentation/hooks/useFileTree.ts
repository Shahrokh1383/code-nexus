import { useCallback, useEffect } from 'react';
import { useFileSystemStore } from '../stores/filesystem.store';
import { useIpc } from './useIpc';
import { useWorkspaceStore } from '../stores/workspace.store';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileTreeDto } from '../../domains/filesystem/application/dto/file-tree.dto';

interface IpcResponse<T> { success: boolean; data?: T; error?: string; }

const getWorkspaceFolderName = (rootPath: string): string => {
  const normalized = rootPath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'Workspace';
};

export function useFileTree() {
  const ipc = useIpc();
  const workspace = useWorkspaceStore((s) => s.workspace);
  const { setTree, setError, tree, totalFiles, totalFolders, error, isScanning, setIsScanning } = useFileSystemStore();

  const fetchFileTree = useCallback(async () => {
    if (!workspace) return;
    setError(null);
    setIsScanning(true); // Start scanning
    try {
      const res = await ipc.invoke(IpcChannels.FILESYSTEM_GET_FILE_TREE, workspace.id) as IpcResponse<FileTreeDto>;
      if (res.success && res.data) {
        const folderName = getWorkspaceFolderName(workspace.rootPath);
        const fixedTree: FileTreeDto = {
          ...res.data,
          root: {
            ...res.data.root,
            name: folderName,
          },
        };
        setTree(fixedTree);
      } else {
        setError(res.error || 'Failed to fetch file tree');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsScanning(false); // Stop scanning
    }
  }, [workspace, ipc, setTree, setError, setIsScanning]);

  useEffect(() => {
    const unsubscribe = ipc.on(IpcChannels.FILESYSTEM_TREE_UPDATED, () => {
      fetchFileTree();
    });
    return () => {
      unsubscribe();
    };
  }, [ipc, fetchFileTree]);

  return { fetchFileTree, tree, totalFiles, totalFolders, error, isScanning };
}