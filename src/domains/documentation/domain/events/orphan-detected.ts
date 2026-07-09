import { DomainEvent } from '@/domains/shared-kernel/events/domain-event';
import { DocumentId } from '../value-objects/document-id';
import { DocumentPath } from '../value-objects/document-path';

export class OrphanDetectedEvent extends DomainEvent {
  constructor(
    readonly documentId: DocumentId,
    readonly path: DocumentPath
  ) {
    super('OrphanDetectedEvent');
  }
}