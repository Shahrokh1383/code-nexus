import { useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../hooks/useWorkspace';
import { useRecentWorkspaces } from '../hooks/useRecentWorkspaces';
import { useIpc } from '../hooks/useIpc';
import { IpcChannels } from '../../../electron/ipc/channels';
import { RecentWorkspacesList } from '../components/welcome/RecentWorkspacesList';
import '../styles/welcome-page.css';
import '../styles/recent-workspaces.css';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function WelcomePage(): JSX.Element {
  const navigate = useNavigate();
  const ipc = useIpc();
  const { initialize, isLoading, error } = useWorkspace();
  const { recents, removeRecent } = useRecentWorkspaces();

  // Navigate to /files as soon as workspace is set in the store
  const { workspace } = useWorkspace();
  useEffect(() => {
    if (workspace) {
      navigate('/files', { replace: true });
    }
  }, [workspace, navigate]);

  const handleOpenFolder = async (): Promise<void> => {
    try {
      const response = (await ipc.invoke(
        IpcChannels.DIALOG_OPEN_FOLDER
      )) as IpcResponse<string[]>;

      if (response.success && response.data && response.data.length > 0) {
        await initialize(response.data[0]);
      }
    } catch {
      // Error is handled inside useWorkspace
    }
  };

  const handleSelectRecent = async (rootPath: string): Promise<void> => {
    await initialize(rootPath);
  };

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <img
          src="./assets/logo.png"
          alt="CodeNexus"
          className="welcome-logo"
        />
        <h2 className="welcome-title gradient-text">CodeNexus</h2>
        <p className="welcome-subtitle">
          Link your documentation to your code. Stay in sync.
        </p>
        <button
          className="btn-primary welcome-open-btn"
          onClick={handleOpenFolder}
          disabled={isLoading}
        >
          <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-folder-open'}`} />
          {isLoading ? 'Opening...' : 'Open Folder'}
        </button>
        {error && <p className="welcome-error">{error}</p>}
      </div>

      <RecentWorkspacesList
        recents={recents}
        onSelect={handleSelectRecent}
        onRemove={removeRecent}
      />
    </div>
  );
}