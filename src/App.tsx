import { useState, type JSX } from 'react';
import { Routes, Route } from 'react-router-dom';
import { WelcomePage } from './presentation/pages/WelcomePage';
import { WorkspaceSetupPage } from './presentation/pages/WorkspaceSetupPage';
import { SettingsModal } from './presentation/components/settings-modal/SettingsModal';
import { useTheme } from './presentation/hooks/useTheme';

export default function App(): JSX.Element {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isLight, toggleTheme } = useTheme();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <img
            src="./assets/logo.png"
            alt="CodeNexus"
            className="logo-animated"
          />
          <h1>CodeNexus</h1>
        </div>
        <button
          className="btn-ghost settings-btn"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open settings"
        >
          <i className="fa-solid fa-gear" />
        </button>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/setup" element={<WorkspaceSetupPage />} />
        </Routes>
      </main>
      {isSettingsOpen && (
        <SettingsModal
          isLight={isLight}
          onToggleTheme={toggleTheme}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}