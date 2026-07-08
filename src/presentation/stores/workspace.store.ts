import { create } from 'zustand';
import { WorkspaceDto } from '../../domains/project/application/dto/workspace.dto';

interface WorkspaceState {
  workspace: WorkspaceDto | null;
  setWorkspace: (workspace: WorkspaceDto | null) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),
  clearWorkspace: () => set({ workspace: null }),
}));