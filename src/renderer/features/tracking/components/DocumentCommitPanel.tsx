import type { JSX } from 'react';
import { CommitButton } from './CommitButton';
import { CommitHistory } from './CommitHistory';
import type { GranularCommitDto } from '@shared/ipc/tracking';

interface DocumentCommitPanelProps {
  documentId: string;
  pendingCount: number;
  commitHistory: GranularCommitDto[];
  isLoading: boolean;
  onApprove: (documentId: string) => void;
}

export function DocumentCommitPanel({
  documentId,
  pendingCount,
  commitHistory,
  isLoading,
  onApprove,
}: DocumentCommitPanelProps): JSX.Element {
  return (
    <div className="document-commit-panel">
      <CommitButton
        documentId={documentId}
        pendingCount={pendingCount}
        onApprove={onApprove}
        isLoading={isLoading}
      />
      <CommitHistory commits={commitHistory} />
    </div>
  );
}