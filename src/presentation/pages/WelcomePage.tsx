import type { JSX } from 'react';
import '../styles/pages/welcome-page.css';

export function WelcomePage(): JSX.Element {
  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <img
          src="./assets/logo.png"
          alt="CodeNexus"
          className="welcome-logo"
        />
        <h2 className="welcome-title">CodeNexus</h2>
        <p className="welcome-subtitle">
          Link your documentation to your code. Stay in sync.
        </p>
      </div>
    </div>
  );
}