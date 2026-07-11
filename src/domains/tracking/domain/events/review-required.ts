import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';

export type ChangeType = 'OUTDATED' | 'ORPHAN' | 'UNLINKED';

export class ReviewRequiredEvent extends DomainEvent {
  readonly documentId: DocumentId;
  readonly filePath: FilePath;
  readonly changeType: ChangeType;

  constructor(documentId: DocumentId, filePath: FilePath, changeType: ChangeType) {
    super('ReviewRequiredEvent');
    this.documentId = documentId;
    this.filePath = filePath;
    this.changeType = changeType;
  }
}