import { create } from 'zustand';
import { FileTreeDto, FolderNodeDto, FileNodeDto } from '../../../domains/filesystem/application/dto/file-tree.dto';

export const isFolderNode = (node: FileNodeDto | FolderNodeDto): node is FolderNodeDto => 
  'children' in node;

interface FileSystemState {
  tree: FolderNodeDto | null;
  totalFiles: number;
  totalFolders: number;
  isScanning: boolean;
  ignoredPatterns: string[];
  changedPaths: Set<string>;
  expandedPaths: Set<string>;
  error: string | null;

  setTree: (tree: FileTreeDto) => void;
  clearTree: () => void;
  setScanning: (isScanning: boolean) => void;
  setError: (error: string | null) => void;
  setIgnoredPatterns: (patterns: string[]) => void;
  addIgnoredPattern: (pattern: string) => void;
  removeIgnoredPattern: (pattern: string) => void;
  toggleFolder: (path: string) => void;
  markChanged: (path: string) => void;
}

export const useFileSystemStore = create<FileSystemState>((set) => ({
  tree: null,
  totalFiles: 0,
  totalFolders: 0,
  isScanning: false,
  ignoredPatterns: [],
  changedPaths: new Set(),
  expandedPaths: new Set(),
  error: null,

  setTree: (tree) => set({ tree: tree.root, totalFiles: tree.totalFiles, totalFolders: tree.totalFolders }),
  clearTree: () => set({ tree: null, totalFiles: 0, totalFolders: 0 }),
  setScanning: (isScanning) => set({ isScanning }),
  setError: (error) => set({ error }),
  setIgnoredPatterns: (ignoredPatterns) => set({ ignoredPatterns }),
  
  addIgnoredPattern: (pattern) => set((state) => ({ ignoredPatterns: [...state.ignoredPatterns, pattern] })),
  removeIgnoredPattern: (pattern) => set((state) => ({ ignoredPatterns: state.ignoredPatterns.filter(p => p !== pattern) })),
  
  toggleFolder: (path) => set((state) => {
    const nextExpanded = new Set(state.expandedPaths);
    nextExpanded.has(path) ? nextExpanded.delete(path) : nextExpanded.add(path);
    return { expandedPaths: nextExpanded };
  }),
  
  markChanged: (path) => set((state) => ({ changedPaths: new Set(state.changedPaths).add(path) })),
}));