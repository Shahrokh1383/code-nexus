import { type JSX } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useWorkspaceStore } from '../../stores/workspace.store';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  shouldShow: () => boolean;
  ariaLabel: string;
}

export function Header(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLight, toggleTheme } = useTheme();
  const workspace = useWorkspaceStore((s) => s.workspace);

  const navItems: NavItem[] = [
    {
      icon: 'fa-folder-tree',
      label: 'Files',
      path: '/files',
      shouldShow: () => !!workspace,
      ariaLabel: 'File Browser',
    },
    {
      icon: 'fa-folder-open',
      label: 'Setup',
      path: '/setup',
      shouldShow: () => location.pathname !== '/setup',
      ariaLabel: 'Workspace setup',
    },
  ];

  return (
    <header className="app-header">
      <div className="logo-container">
        <h1 className="gradient-text">CodeNexus</h1>
      </div>
      <div className="header-actions">
        {navItems.map((item) =>
          item.shouldShow() ? (
            <button
              key={item.path}
              className="btn-ghost nav-setup-btn"
              onClick={() => navigate(item.path)}
              aria-label={item.ariaLabel}
            >
              <i className={`fa-solid ${item.icon}`} />
              <span className="nav-label">{item.label}</span>
            </button>
          ) : null
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