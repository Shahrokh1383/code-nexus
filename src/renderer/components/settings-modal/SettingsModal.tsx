import type { JSX } from 'react';
import '../../styles/components/settings-modal.css';

interface SettingsModalProps {
  isLight: boolean;
  onToggleTheme: () => void;
  onClose: () => void;
}

export function SettingsModal({
  isLight,
  onToggleTheme,
  onClose,
}: SettingsModalProps): JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="modal-body">
          <div className="setting-row">
            <span>Theme</span>
            <button className="btn-ghost theme-toggle" onClick={onToggleTheme}>
              <i className={isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun'} />
              {isLight ? ' Dark Mode' : ' Light Mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}