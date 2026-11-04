import { JSX } from 'react';

interface LinkingPageHeaderProps {
  totalCodeLinks: number;
  totalDocLinks: number;
  unlinkedCount: number;
  onCreateLink: () => void;
}

export function LinkingPageHeader({ totalCodeLinks, totalDocLinks, unlinkedCount, onCreateLink }: LinkingPageHeaderProps): JSX.Element {
  return (
    <div className="linking-header">
      <div>
        <h2 className="gradient-text" style={{ marginBottom: '4px' }}>Knowledge Graph</h2>
        <div className="text-secondary" style={{ fontSize: 'var(--cn-font-size-sm)' }}>
          <span className="text-primary fw-bold">{totalCodeLinks}</span> Code Links &nbsp;|&nbsp; 
          <span className="text-primary fw-bold">{totalDocLinks}</span> Hierarchies &nbsp;|&nbsp; 
          <span className={unlinkedCount > 0 ? 'status-doc-orphan fw-bold' : ''}>{unlinkedCount}</span> Unlinked Files
        </div>
      </div>
      <button className="btn btn-primary" onClick={onCreateLink}>
        <i className="fa-solid fa-link me-2"></i> Create Link
      </button>
    </div>
  );
}