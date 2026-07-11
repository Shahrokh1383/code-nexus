import type { JSX } from 'react';

interface TrackingPageHeaderProps {
  pendingCount: number;
  commitCount: number;
}

export function TrackingPageHeader({ pendingCount, commitCount }: TrackingPageHeaderProps): JSX.Element {
  return (
    <div className="tracking-header">
      <div className="tracking-header__info">
        <h1>
          <i className="fa-solid fa-shield-halved text-primary" /> Tracking
        </h1>
        <p className="tracking-header__subtitle">
          Monitor file changes and approve commits per document
        </p>
      </div>
      <div className="tracking-header__stats">
        <div className="tracking-stat tracking-stat--pending">
          <span className="tracking-stat__value">{pendingCount}</span>
          <span className="tracking-stat__label">Pending</span>
        </div>
        <div className="tracking-stat tracking-stat--commits">
          <span className="tracking-stat__value">{commitCount}</span>
          <span className="tracking-stat__label">Commits</span>
        </div>
      </div>
    </div>
  );
}