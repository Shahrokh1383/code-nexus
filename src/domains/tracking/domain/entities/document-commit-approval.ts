import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../value-objects/commit-id';
import { DateTime } from '../../../shared-kernel/types/date-time';

export class DocumentCommitApproval {
  private readonly _documentId: DocumentId;
  private readonly _commitId: CommitId;
  private readonly _approvedAt: DateTime;

  constructor(documentId: DocumentId, commitId: CommitId, approvedAt: DateTime) {
    this._documentId = documentId;
    this._commitId = commitId;
    this._approvedAt = approvedAt;
  }

  get documentId(): DocumentId { return this._documentId; }
  get commitId(): CommitId { return this._commitId; }
  get approvedAt(): DateTime { return this._approvedAt; }
}