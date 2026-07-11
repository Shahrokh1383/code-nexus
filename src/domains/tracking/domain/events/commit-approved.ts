import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { CommitId } from '../value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';

export class CommitApprovedEvent extends DomainEvent {
  readonly commitId: CommitId;
  readonly documentId: DocumentId;
  readonly filePaths: FilePath[];

  constructor(commitId: CommitId, documentId: DocumentId, filePaths: FilePath[]) {
    super('CommitApprovedEvent');
    this.commitId = commitId;
    this.documentId = documentId;
    this.filePaths = [...filePaths];
  }
}