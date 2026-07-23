import { DocumentCommitApproval } from '../../../domain/entities/document-commit-approval';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('DocumentCommitApproval', () => {
  it('should store document id, commit id, and approval timestamp', () => {
    const docId = new DocumentId('doc-1');
    const commitId = new CommitId('commit-1');
    const now = DateTime.now();

    const approval = new DocumentCommitApproval(docId, commitId, now);

    expect(approval.documentId).toBe(docId);
    expect(approval.commitId).toBe(commitId);
    expect(approval.approvedAt).toBe(now);
  });

  it('should differentiate two approvals by timestamp', () => {
    const docId = new DocumentId('doc-1');
    const commitId = new CommitId('commit-1');
    const a = new DocumentCommitApproval(docId, commitId, DateTime.fromISO('2024-01-01'));
    const b = new DocumentCommitApproval(docId, commitId, DateTime.fromISO('2024-06-01'));

    expect(a.approvedAt.equals(b.approvedAt)).toBe(false);
  });
});