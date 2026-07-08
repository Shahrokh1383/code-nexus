import { useWorkspaceStore } from '../workspace.store';

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ workspace: null });
  });

  it('should set workspace', () => {
    const workspace = {
      id: 'ws-1',
      rootPath: '/test',
      metadataFolderPath: '.doclink',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastScanAt: null,
    };

    useWorkspaceStore.getState().setWorkspace(workspace);

    expect(useWorkspaceStore.getState().workspace).toEqual(workspace);
  });

  it('should clear workspace', () => {
    useWorkspaceStore.getState().setWorkspace({
      id: 'ws-1',
      rootPath: '/test',
      metadataFolderPath: '.doclink',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastScanAt: null,
    });

    useWorkspaceStore.getState().clearWorkspace();

    expect(useWorkspaceStore.getState().workspace).toBeNull();
  });
});