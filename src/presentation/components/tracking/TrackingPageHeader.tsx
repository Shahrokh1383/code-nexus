import type { JSX } from 'react';

interface TrackingPageHeaderProps {
  pendingDocCount: number;
  totalPendingFiles: number;
}

export function TrackingPageHeader({ pendingDocCount, totalPendingFiles }: TrackingPageHeaderProps): JSX.Element {
  return (
    <div className="tracking-header">
      <div className="tracking-header__info">
        <h1>
          <i className="fa-solid fa-shield-halved text-primary" /> Tracking
        </h1>
        <p className="tracking-header__subtitle">
          Real‑time monitoring of document changes
        </p>
      </div>
      <div className="tracking-header__stats">
        <div className="tracking-stat tracking-stat--pending">
          <span className="tracking-stat__value">{pendingDocCount}</span>
          <span className="tracking-stat__label">Documents Pending</span>
        </div>
        <div className="tracking-stat tracking-stat--commits">
          <span className="tracking-stat__value">{totalPendingFiles}</span>
          <span className="tracking-stat__label">Pending Files</span>
        </div>
      </div>
    </div>
  );
}