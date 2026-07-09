import { type JSX } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './presentation/components/layout/Header';
import { WelcomePage } from './presentation/pages/WelcomePage';
import { WorkspaceSetupPage } from './presentation/pages/WorkspaceSetupPage';
import { FileBrowserPage } from './presentation/pages/FileBrowserPage';

export default function App(): JSX.Element {
  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/setup" element={<WorkspaceSetupPage />} />
          <Route path="/files" element={<FileBrowserPage />} />
        </Routes>
      </main>
    </div>
  );
}