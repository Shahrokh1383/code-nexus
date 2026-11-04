import { JSX } from 'react';

interface LinkBadgeProps {
  codeCount: number;
  docCount: number;
}

export function LinkBadge({ codeCount, docCount }: LinkBadgeProps): JSX.Element {
  if (codeCount === 0 && docCount === 0) return <span className="text-disabled" style={{ fontSize: 'var(--cn-font-size-xs)' }}>Unlinked</span>;

  return (
    <div className="link-badge-group">
      {codeCount > 0 && <span className="pill-success">{codeCount} Code</span>}
      {docCount > 0 && <span className="pill-warning">{docCount} Doc</span>}
    </div>
  );
}