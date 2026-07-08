import { act, renderHook, waitFor } from '@testing-library/react';
import { useWorkspace } from '../useWorkspace';
import { useWorkspaceStore } from '../../stores/workspace.store';

const mockInvoke = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the global Zustand store to its initial state
  useWorkspaceStore.getState().clearWorkspace();
  Object.defineProperty(window, 'electronAPI', {
    value: { invoke: mockInvoke },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (window as any).electronAPI;
});

describe('useWorkspace', () => {
  it('should initialize workspace successfully', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        id: 'ws-1',
        rootPath: '/test/project',
        metadataFolderPath: '.doclink',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastScanAt: null,
      },
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.initialize('/test/project');
    });

    await waitFor(() => {
      expect(result.current.workspace).not.toBeNull();
      expect(result.current.workspace?.id).toBe('ws-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle initialization failure', async () => {
    mockInvoke.mockResolvedValue({
      success: false,
      error: 'Path does not exist',
    });

    const { result } = renderHook(() => useWorkspace());

    await act(async () => {
      await result.current.initialize('/bad/path');
    });

    await waitFor(() => {
      expect(result.current.workspace).toBeNull();
      expect(result.current.error).toBe('Path does not exist');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should set loading state during initialization', async () => {
    mockInvoke.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: null }), 100))
    );

    const { result } = renderHook(() => useWorkspace());

    act(() => {
      result.current.initialize('/test/project');
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});