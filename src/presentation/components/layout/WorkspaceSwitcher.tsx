import { type JSX, useState, useCallback } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useRecentWorkspaces } from '../../hooks/useRecentWorkspaces';
import { useIpc } from '../../hooks/useIpc';
import { IpcChannels } from '../../../../electron/ipc/channels';
import '../../styles/workspace-switcher.css';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface WorkspaceSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceSwitcher({ isOpen, onClose }: WorkspaceSwitcherProps): JSX.Element | null {
  const { switchWorkspace, workspace, isLoading } = useWorkspace();
  const { recents, removeRecent, fetchRecents } = useRecentWorkspaces();
  const ipc = useIpc();
  const [isPickerLoading, setIsPickerLoading] = useState(false);

  const handleOpenFolder = useCallback(async () => {
    setIsPickerLoading(true);
    try {
      const response = (await ipc.invoke(IpcChannels.DIALOG_OPEN_FOLDER)) as IpcResponse<string[]>;
      if (response.success && response.data && response.data.length > 0) {
        const selectedPath = response.data[0];
        await switchWorkspace(selectedPath);
        fetchRecents(); // Update recents list
        onClose();
      }
    } finally {
      setIsPickerLoading(false);
    }
  }, [ipc, switchWorkspace, fetchRecents, onClose]);

  const handleSwitchToRecent = useCallback(
    async (rootPath: string) => {
      await switchWorkspace(rootPath);
      onClose();
    },
    [switchWorkspace, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="ws-switcher-overlay" onClick={onClose}>
      <div className="ws-switcher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ws-switcher-header">
          <h2>Workspaces</h2>
          <button className="btn-ghost ws-close-btn" onClick={onClose} aria-label="Close switcher">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="ws-switcher-body">
          <button 
            className="ws-add-new-card" 
            onClick={handleOpenFolder}
            disabled={isPickerLoading || isLoading}
          >
            <i className="fa-solid fa-folder-plus" />
            <span>{isPickerLoading ? 'Loading...' : 'Add New Workspace'}</span>
          </button>

          <div className="ws-recents-list">
            <h3>Recent</h3>
            {recents.length === 0 && !isPickerLoading && (
              <p className="ws-empty-state">No recent workspaces found.</p>
            )}

            {recents.map((recent) => {
              const isActive = workspace?.rootPath === recent.rootPath;
              return (
                <div 
                  key={recent.id} 
                  className={`ws-recent-card ${isActive ? 'active' : ''}`}
                >
                  <div 
                    className="ws-recent-info" 
                    onClick={() => !isActive && handleSwitchToRecent(recent.rootPath)}
                    role="button"
                    tabIndex={0}
                  >
                    <i className="fa-solid fa-folder-tree" />
                    <div className="ws-path-container">
                      <span className="ws-root-name">
                        {recent.rootPath.split(/[\\/]/).pop()}
                      </span>
                      <span className="ws-full-path">{recent.rootPath}</span>
                    </div>
                  </div>
                  
                  <div className="ws-recent-actions">
                    {isActive ? (
                      <span className="ws-active-badge">Active</span>
                    ) : (
                      <button 
                        className="btn-ghost ws-remove-btn" 
                        onClick={() => removeRecent(recent.id)}
                        aria-label="Remove recent"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}