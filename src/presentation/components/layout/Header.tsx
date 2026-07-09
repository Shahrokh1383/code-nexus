import { type JSX, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useWorkspace } from '../../hooks/useWorkspace';

interface NavItem {
  icon: string;
  label: string;
  action: () => void;
  shouldShow: () => boolean;
  ariaLabel: string;
  variant?: 'danger';
}

export function Header(): JSX.Element {
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useTheme();
  const { workspace, closeWorkspace } = useWorkspace();

  const handleClose = useCallback(async () => {
    await closeWorkspace();
    navigate('/', { replace: true });
  }, [closeWorkspace, navigate]);

  const navItems: NavItem[] = [
    {
      icon: 'fa-folder-tree',
      label: 'Files',
      action: () => navigate('/files'),
      shouldShow: () => !!workspace,
      ariaLabel: 'File Browser',
    },
    {
      icon: 'fa-right-from-bracket',
      label: 'Close Folder',
      action: handleClose,
      shouldShow: () => !!workspace,
      ariaLabel: 'Close current workspace',
      variant: 'danger',
    },
  ];

  return (
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
        {navItems.map((item) =>
          item.shouldShow() ? (
            <button
              key={item.label}
              className={`btn-ghost nav-setup-btn ${item.variant === 'danger' ? 'nav-danger-btn' : ''}`}
              onClick={item.action}
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