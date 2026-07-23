import { create } from 'zustand';
import { FileTreeDto } from '../../domains/filesystem/application/dto/file-tree.dto';
import { FolderNodeDto } from '../../domains/filesystem/application/dto/folder-node.dto';
import { FileNodeDto } from '../../domains/filesystem/application/dto/file-node.dto';

export const isFolderNode = (node: FileNodeDto | FolderNodeDto): node is FolderNodeDto => 
  'children' in node;

interface FileSystemState {
  tree: FolderNodeDto | null;
  totalFiles: number;
  totalFolders: number;
  ignoredPatterns: string[];
  expandedPaths: Set<string>;
  error: string | null;

  setTree: (tree: FileTreeDto) => void;
  clearTree: () => void;
  setError: (error: string | null) => void;
  setIgnoredPatterns: (patterns: string[]) => void;
  addIgnoredPattern: (pattern: string) => void;
  removeIgnoredPattern: (pattern: string) => void;
  toggleFolder: (path: string) => void;
}

export const useFileSystemStore = create<FileSystemState>((set) => ({
  tree: null,
  totalFiles: 0,
  totalFolders: 0,
  ignoredPatterns: [],
  expandedPaths: new Set(),
  error: null,

  setTree: (tree) => set({ tree: tree.root, totalFiles: tree.totalFiles, totalFolders: tree.totalFolders }),
  clearTree: () => set({ tree: null, totalFiles: 0, totalFolders: 0 }),
  setError: (error) => set({ error }),
  setIgnoredPatterns: (ignoredPatterns) => set({ ignoredPatterns }),
  
  addIgnoredPattern: (pattern) => set((state) => ({ ignoredPatterns: [...state.ignoredPatterns, pattern] })),
  removeIgnoredPattern: (pattern) => set((state) => ({ ignoredPatterns: state.ignoredPatterns.filter(p => p !== pattern) })),
  
  toggleFolder: (path) => set((state) => {
    const nextExpanded = new Set(state.expandedPaths);
    nextExpanded.has(path) ? nextExpanded.delete(path) : nextExpanded.add(path);
    return { expandedPaths: nextExpanded };
  }),
}));