import { type JSX, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useWorkspace } from '../../hooks/useWorkspace';
import { WorkspaceSwitcher } from './WorkspaceSwitcher'; // NEW

export function Header(): JSX.Element {
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useTheme();
  const { workspace, closeWorkspace } = useWorkspace();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const handleClose = useCallback(async () => {
    await closeWorkspace();
    navigate('/', { replace: true });
  }, [closeWorkspace, navigate]);

  return (
    <>
      <header className="app-header">
        <div
          className="logo-container"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
        >
          <h1 className="gradient-text">CodeNexus</h1>
        </div>
        
        <div className="header-actions">
          {workspace && (
            <>
              {/* NEW: Enterprise Workspace Switcher Button */}
              <button 
                className="btn-ghost nav-setup-btn" 
                onClick={() => setIsSwitcherOpen(true)}
                aria-label="Switch Workspace"
                title={workspace.rootPath}
              >
                <i className="fa-solid fa-arrows-rotate" />
                <span className="nav-label">
                  {workspace.rootPath.split(/[\\/]/).pop()}
                </span>
              </button>

              <button className="btn-ghost nav-setup-btn" onClick={() => navigate('/files')}>
                <i className="fa-solid fa-folder-tree" />
                <span className="nav-label">Files</span>
              </button>
              <button className="btn-ghost nav-setup-btn" onClick={() => navigate('/docs')}>
                <i className="fa-solid fa-book-open" />
                <span className="nav-label">Docs</span>
              </button>
              <button className="btn-ghost nav-setup-btn" onClick={() => navigate('/tracking')}>
                <i className="fa-solid fa-clock-rotate-left" />
                <span className="nav-label">Tracking</span>
              </button>
              <button className="btn-ghost nav-setup-btn" onClick={() => navigate('/linking')}>
                <i className="fa-solid fa-diagram-project" />
                <span className="nav-label">Links</span>
              </button>
              <button className="btn-ghost nav-setup-btn nav-danger-btn" onClick={handleClose}>
                <i className="fa-solid fa-right-from-bracket" />
                <span className="nav-label">Close</span>
              </button>
            </>
          )}
          
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
            <i className={`fa-solid ${isLight ? 'fa-moon' : 'fa-sun'}`} />
          </button>
        </div>
      </header>

      {/* Render the Switcher Overlay */}
      <WorkspaceSwitcher isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
    </>
  );
}