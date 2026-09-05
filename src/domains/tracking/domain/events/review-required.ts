import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { TrackedFilePath } from '../value-objects/tracked-file-path';

export type ChangeType = 'OUTDATED' | 'ORPHAN' | 'UNLINKED';

export class ReviewRequiredEvent extends DomainEvent {
  readonly documentId: DocumentId;
  readonly filePath: TrackedFilePath;
  readonly changeType: ChangeType;

  constructor(documentId: DocumentId, filePath: TrackedFilePath, changeType: ChangeType) {
    super('ReviewRequiredEvent');
    this.documentId = documentId;
    this.filePath = filePath;
    this.changeType = changeType;
  }
}