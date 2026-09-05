import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { CommitId } from '../value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { TrackedFilePath } from '../value-objects/tracked-file-path';

export class CommitApprovedEvent extends DomainEvent {
  readonly commitId: CommitId;
  readonly documentId: DocumentId;
  readonly filePaths: TrackedFilePath[];

  constructor(commitId: CommitId, documentId: DocumentId, filePaths: TrackedFilePath[]) {
    super('CommitApprovedEvent');
    this.commitId = commitId;
    this.documentId = documentId;
    this.filePaths = [...filePaths];
  }
}