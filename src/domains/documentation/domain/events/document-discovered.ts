import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { DocumentId } from '../value-objects/document-id';
import { DocumentPath } from '../value-objects/document-path';

export class DocumentDiscoveredEvent extends DomainEvent {
  constructor(
    readonly documentId: DocumentId,
    readonly path: DocumentPath,
    readonly title: string
  ) {
    super('DocumentDiscoveredEvent');
  }
}