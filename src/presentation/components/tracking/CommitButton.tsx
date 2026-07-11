import type { JSX } from 'react';

interface CommitButtonProps {
  documentId: string;
  pendingCount: number;
  onApprove: (documentId: string) => void;
  isLoading: boolean;
}

export function CommitButton({ documentId, pendingCount, onApprove, isLoading }: CommitButtonProps): JSX.Element {
  const isDisabled = pendingCount === 0 || isLoading;

  return (
    <button
      className={`btn btn-primary commit-button ${isDisabled ? 'commit-button--disabled' : ''}`}
      onClick={() => onApprove(documentId)}
      disabled={isDisabled}
      title={isDisabled ? 'No pending changes to commit' : 'Approve commit for this document'}
    >
      {isLoading ? (
        <>
          <i className="fa-solid fa-spinner fa-spin" /> Processing...
        </>
      ) : (
        <>
          <i className="fa-solid fa-check-double" /> Approve Commit
          {pendingCount > 0 && (
            <span className="commit-button__badge">{pendingCount}</span>
          )}
        </>
      )}
    </button>
  );
}