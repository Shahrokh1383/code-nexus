import { create } from 'zustand';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';

export const isFolderNode = (node: FileNodeDto | FolderNodeDto): node is FolderNodeDto =>
  'children' in node;

interface FileSystemUiState {
  expandedPaths: Set<string>;
  toggleFolder: (path: string) => void;
  reset: () => void;
}

/**
 * File-system UI state (expand/collapse) — the only Zustand store in this
 * feature. Server state lives in React Query (Constitution §18).
 */
export const useFileSystemStore = create<FileSystemUiState>((set) => ({
  expandedPaths: new Set<string>(),

  toggleFolder: (path) =>
    set((state) => {
      const nextExpanded = new Set(state.expandedPaths);
      if (nextExpanded.has(path)) {
        nextExpanded.delete(path);
      } else {
        nextExpanded.add(path);
      }
      return { expandedPaths: nextExpanded };
    }),

  reset: () => set({ expandedPaths: new Set<string>() }),
}));