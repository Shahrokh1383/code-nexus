import { create } from 'zustand';
import type { DocumentDto } from '@shared/ipc/documentation';

interface TrackingUiState {
  selectedDocument: DocumentDto | null;
  searchQuery: string;
  selectedFilePath: string | null;
  isDiffModalOpen: boolean;
  setSelectedDocument: (doc: DocumentDto | null) => void;
  setSearchQuery: (q: string) => void;
  setSelectedFilePath: (path: string | null) => void;
  setDiffModalOpen: (open: boolean) => void;
}

export const useTrackingStore = create<TrackingUiState>((set) => ({
  selectedDocument: null,
  searchQuery: '',
  selectedFilePath: null,
  isDiffModalOpen: false,
  setSelectedDocument: (doc) =>
    set({ selectedDocument: doc, selectedFilePath: null, isDiffModalOpen: false }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedFilePath: (path) => set({ selectedFilePath: path }),
  setDiffModalOpen: (open) => set({ isDiffModalOpen: open }),
}));