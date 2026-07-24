import { useState, useCallback, useEffect, useMemo } from 'react';
import { FolderNodeDto } from '../../../domains/filesystem/application/dto/folder-node.dto';
import { FileNodeDto } from '../../../domains/filesystem/application/dto/file-node.dto';
import { useFileTree } from '../useFileTree';

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

export function useFileTreePicker(
  isOpen: boolean,
  documents: DocumentOption[],
  initialDocumentId: string
) {
  // Replaced scanProject with fetchFileTree and pulled isScanning from the hook directly
  const { tree, isScanning, fetchFileTree } = useFileTree();

  const [activeTab, setActiveTab] = useState<PickerTab>('code');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedFileIds(new Set());
      setSelectedDocumentIds(new Set());
      setActiveTab('code');
      if (!tree) fetchFileTree();
    }
  }, [isOpen, initialDocumentId, tree, fetchFileTree]);

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