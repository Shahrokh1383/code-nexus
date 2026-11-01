import { create } from 'zustand';
import type { FileNodeDto, FolderNodeDto } from '@shared/ipc/filesystem';

export const isFolderNode = (node: FileNodeDto | FolderNodeDto): node is FolderNodeDto =>
  'children' in node;

interface FileSystemUiState {
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
  toggleFolder: (path: string) => void;
  toggleSelection: (path: string) => void;
  clearSelection: () => void;
  reset: () => void;
}

/**
 * File-system UI state (expand/collapse + selection). Both are per-node
 * boolean selectors — Zustand's `Object.is` bail means a toggle only
 * re-renders the affected node, regardless of tree size (O(1) at 100k).
 */
export const useFileSystemStore = create<FileSystemUiState>((set) => ({
  expandedPaths: new Set<string>(),
  selectedPaths: new Set<string>(),

  toggleFolder: (path) =>
    set((state) => {
      const next = new Set(state.expandedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { expandedPaths: next };
    }),

  toggleSelection: (path) =>
    set((state) => {
      const next = new Set(state.selectedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { selectedPaths: next };
    }),

  clearSelection: () => set({ selectedPaths: new Set<string>() }),

  reset: () => set({ expandedPaths: new Set<string>(), selectedPaths: new Set<string>() }),
}));