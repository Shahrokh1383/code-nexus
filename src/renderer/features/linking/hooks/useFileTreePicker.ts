import { useState, useCallback, useEffect, useMemo } from 'react';
import type { FolderNodeDto, FileNodeDto } from '@shared/ipc/filesystem';
import { useFileTree } from '../../filesystem';

type PickerTab = 'code' | 'document';

interface DocumentOption {
  id: string;
  title: string;
}

export function isFolderNode(node: FolderNodeDto | FileNodeDto): node is FolderNodeDto {
  return 'children' in node;
}

export function getAllFileIds(node: FolderNodeDto | FileNodeDto): string[] {
  if (!isFolderNode(node)) return [node.id];
  return node.children.flatMap(child => getAllFileIds(child));
}

// ─── Filter helpers (merged from useFilteredFileTree.ts) ───

function filterTree(
  node: FolderNodeDto | FileNodeDto,
  searchTermLower: string
): FolderNodeDto | FileNodeDto | null {
  if ('children' in node) {
    const filteredChildren = node.children
      .map(child => filterTree(child, searchTermLower))
      .filter((child): child is FolderNodeDto | FileNodeDto => child !== null);
    if (filteredChildren.length > 0 || node.name.toLowerCase().includes(searchTermLower)) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }
  return node.name.toLowerCase().includes(searchTermLower) ? { ...node } : null;
}

export function useFilteredFileTree(
  tree: FolderNodeDto | null | undefined,
  searchTerm: string
): FolderNodeDto | null {
  return useMemo(() => {
    if (!tree) return null;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tree;
    const filtered = filterTree(tree, term);
    return (filtered as FolderNodeDto) ?? null;
  }, [tree, searchTerm]);
}

export function getAllFolderIds(node: FolderNodeDto | FileNodeDto): string[] {
  if ('children' in node) {
    return [node.id, ...node.children.flatMap(getAllFolderIds)];
  }
  return [];
}

// ─── Picker hook ───

export function useFileTreePicker(
  isOpen: boolean,
  documents: DocumentOption[],
  initialDocumentId: string
) {
  const { tree, isScanning } = useFileTree();

  const [activeTab, setActiveTab] = useState<PickerTab>('code');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  // Reset only when the modal opens or the target document changes. Do not
  // depend on `tree`: a filesystem event during an active picker should not
  // wipe the user's in-progress selection.
  useEffect(() => {
    if (isOpen) {
      setSelectedFileIds(new Set());
      setSelectedDocumentIds(new Set());
      setActiveTab('code');
    }
  }, [isOpen, initialDocumentId]);

  const toggleFile = useCallback((id: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleFolder = useCallback((folder: FolderNodeDto, select: boolean) => {
    const ids = getAllFileIds(folder);
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => select ? next.add(id) : next.delete(id));
      return next;
    });
  }, []);

  const toggleDocument = useCallback((id: string) => {
    setSelectedDocumentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllDocuments = useCallback(() => {
    setSelectedDocumentIds(prev => {
      if (prev.size === documents.length) return new Set();
      return new Set(documents.map(d => d.id));
    });
  }, [documents]);

  const isAllFilesSelected = useMemo(() => {
    if (!tree) return false;
    const allIds = getAllFileIds(tree);
    return allIds.length > 0 && selectedFileIds.size === allIds.length;
  }, [tree, selectedFileIds]);

  const handleToggleAllFiles = useCallback(() => {
    if (!tree) return;
    const allIds = getAllFileIds(tree);
    if (isAllFilesSelected) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(allIds));
    }
  }, [tree, isAllFilesSelected]);

  const documentSourceList = useMemo(
    () => documents.filter(d => d.id !== initialDocumentId),
    [documents, initialDocumentId]
  );

  return {
    tree,
    isScanning,
    activeTab,
    setActiveTab,
    selectedFileIds,
    selectedDocumentIds,
    toggleFile,
    toggleFolder,
    toggleDocument,
    handleSelectAllDocuments,
    handleToggleAllFiles,
    isAllFilesSelected,
    documentSourceList,
  };
}