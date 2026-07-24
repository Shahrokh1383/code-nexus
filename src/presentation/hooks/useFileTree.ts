// src/presentation/hooks/useFileTree.ts

import { useCallback, useEffect } from 'react';
import { useFileSystemStore } from '../stores/filesystem.store';
import { useIpc } from './useIpc';
import { useWorkspaceStore } from '../stores/workspace.store';
import { IpcChannels } from '../../../electron/ipc/channels';
import { FileTreeDto } from '../../domains/filesystem/application/dto/file-tree.dto';

interface IpcResponse<T> { success: boolean; data?: T; error?: string; }

/**
 * Extracts the human‑readable folder name from the workspace root path.
 * Ensures the file‑tree root is displayed with the actual folder name,
 * not the internal relative path ".".
 */
const getWorkspaceFolderName = (rootPath: string): string => {
  const normalized = rootPath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'Workspace';
};

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
        // Replace root node name with the actual workspace folder name
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