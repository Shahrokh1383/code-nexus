// src/App.tsx
import { type JSX, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Header } from './presentation/components/layout/Header';
import { WelcomePage } from './presentation/pages/WelcomePage';
import { FileBrowserPage } from './presentation/pages/FileBrowserPage';
import { DocumentManagerPage } from './presentation/pages/DocumentManagerPage';
import { useWorkspace } from './presentation/hooks/useWorkspace';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <AppBootstrap />
    </HashRouter>
  );
}

function AppBootstrap(): JSX.Element {
  const { workspace, rehydrate } = useWorkspace();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const location = useLocation();

  // 1. Bootstrap: Rehydrate state from backend on mount
  useEffect(() => {
    rehydrate().finally(() => setIsBootstrapping(false));
  }, [rehydrate]);

  // 2. Route Guard: Redirect to home if workspace is lost but URL is protected
  useEffect(() => {
    if (!isBootstrapping && !workspace && location.pathname !== '/') {
      // We don't navigate programmatically here to avoid loops; 
      // we let the render logic below handle the <Navigate /> component.
    }
  }, [isBootstrapping, workspace, location]);

  // 3. Loading State: Prevent UI flash
  if (isBootstrapping) {
    return (
      <div className="app-bootstrap-loader">
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', letterSpacing: '1px' }}>
          CodeNexus
        </h1>
        <i className="fa-solid fa-spinner fa-spin text-primary" style={{ fontSize: '1.5rem' }} />
      </div>
    );
  }

  // 4. Guard Logic: If no workspace and not on Welcome page, force redirect
  if (!workspace && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/files" element={<FileBrowserPage />} />
          <Route path="/docs" element={<DocumentManagerPage />} />
        </Routes>
      </main>
    </div>
  );
}