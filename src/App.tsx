import { type JSX } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Header } from './presentation/components/layout/Header';
import { WelcomePage } from './presentation/pages/WelcomePage';
import { FileBrowserPage } from './presentation/pages/FileBrowserPage';
import { DocumentManagerPage } from './presentation/pages/DocumentManagerPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
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
    </HashRouter>
  );
}