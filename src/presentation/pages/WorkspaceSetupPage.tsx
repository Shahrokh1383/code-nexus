import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../hooks/useWorkspace';
import { useIpc } from '../hooks/useIpc';
import { IpcChannels } from '../../../electron/ipc/channels';

interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function WorkspaceSetupPage(): JSX.Element {
  const { initialize, workspace, isLoading, error } = useWorkspace();
  const ipc = useIpc();
  const navigate = useNavigate();
  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleSelectFolder = async (): Promise<void> => {
    setDialogError(null);

    try {
      const response = (await ipc.invoke(
        IpcChannels.DIALOG_OPEN_FOLDER
      )) as IpcResponse<string[]>;

      if (response.success && response.data && response.data.length > 0) {
        await initialize(response.data[0]);
      }
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Failed to open folder dialog');
    }
  };

  if (workspace) {
    navigate('/');
    return <></>;
  }

  return (
    <div className="workspace-setup-page">
      <div className="setup-hero">
        <h2 className="setup-title">Select Workspace</h2>
        <p className="setup-subtitle">
          Choose the root folder of your project to begin.
        </p>
        <button
          className="btn-primary setup-btn"
          onClick={handleSelectFolder}
          disabled={isLoading}
        >
          {isLoading ? 'Initializing...' : 'Choose Folder'}
        </button>
        {(error || dialogError) && (
          <p className="setup-error">{error || dialogError}</p>
        )}
      </div>
    </div>
  );
}