import { useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace, useRecentWorkspaces, workspaceApi } from '../features/workspace';
import { RecentWorkspacesList } from '../shared/components/RecentWorkspacesList';
import '../shared/styles/welcome-page.css';
import '../shared/styles/recent-workspaces.css';

export function WelcomePage(): JSX.Element {
  const navigate = useNavigate();
  const { initialize, isLoading, error } = useWorkspace();
  const { recents, removeRecent } = useRecentWorkspaces();

  // Navigate to /files as soon as workspace is set
  const { workspace } = useWorkspace();
  useEffect(() => {
    if (workspace) {
      navigate('/files', { replace: true });
    }
  }, [workspace, navigate]);

  const handleOpenFolder = async (): Promise<void> => {
    try {
      const selectedPaths = await workspaceApi.openFolderDialog();
      if (selectedPaths.length > 0) {
        await initialize(selectedPaths[0]);
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