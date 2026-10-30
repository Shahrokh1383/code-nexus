import type { JSX } from 'react';

export function OrphanBadge(): JSX.Element {
  return (
    <span className="orphan-badge" title="This document has no linked code files">
      <i className="fa-solid fa-triangle-exclamation" />
      <span>Orphaned</span>
    </span>
  );
}