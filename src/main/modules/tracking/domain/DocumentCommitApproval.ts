import { CommitId } from './GranularCommit';

export class DocumentCommitApproval {
  constructor(
    public readonly documentId: { value: string },
    public readonly commitId: CommitId,
    public readonly approvedAt: Date,
  ) {}
}