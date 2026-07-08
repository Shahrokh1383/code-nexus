import { type JSX } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

export function Header(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLight, toggleTheme } = useTheme();

  const isOnSetupPage = location.pathname === '/setup';

  return (
    <header className="app-header">
      <div className="logo-container">
        <h1 className="gradient-text">CodeNexus</h1>
      </div>
      <div className="header-actions">
        {!isOnSetupPage && (
          <button
            className="btn-ghost nav-setup-btn"
            onClick={() => navigate('/setup')}
            aria-label="Workspace setup"
          >
            <i className="fa-solid fa-folder-open" />
            <span className="nav-label">Setup</span>
          </button>
        )}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <i className={`fa-solid ${isLight ? 'fa-moon' : 'fa-sun'}`} />
        </button>
      </div>
    </header>
  );
}