import { type JSX, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Header } from './presentation/components/layout/Header';
import { WelcomePage } from './presentation/pages/WelcomePage';
import { FileBrowserPage } from './presentation/pages/FileBrowserPage';
import { DocumentManagerPage } from './presentation/pages/DocumentManagerPage';
import { TrackingPage } from './presentation/pages/TrackingPage';
import { useWorkspace } from './presentation/hooks/useWorkspace';
import { LinkingPage } from './presentation/pages/LinkingPage';

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

  useEffect(() => {
    rehydrate().finally(() => setIsBootstrapping(false));
  }, [rehydrate]);

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

  if (!workspace && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  return (
    // The key prop forces React to completely unmount and remount the entire app tree
    // when the workspace ID changes. This guarantees zero local state leakage.
    <div className="app-container" key={workspace?.id ?? 'no-workspace'}>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/files" element={<FileBrowserPage />} />
          <Route path="/docs" element={<DocumentManagerPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/linking" element={<LinkingPage />} />
        </Routes>
      </main>
    </div>
  );
}