import { Routes, Route } from 'react-router-dom';

export default function App(): JSX.Element {
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
      </header>
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={<div className="welcome-page">Welcome to CodeNexus</div>}
          />
        </Routes>
      </main>
    </div>
  );
}
