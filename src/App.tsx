import { type JSX } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './presentation/components/layout/Header';
import { WelcomePage } from './presentation/pages/WelcomePage';
import { WorkspaceSetupPage } from './presentation/pages/WorkspaceSetupPage';

export default function App(): JSX.Element {
  return (
    <div className="app-container">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/setup" element={<WorkspaceSetupPage />} />
        </Routes>
      </main>
    </div>
  );
}