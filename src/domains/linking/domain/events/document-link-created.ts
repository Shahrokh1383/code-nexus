import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { Identifier } from '../../../shared-kernel/types/identifier';

export class DocumentLinkCreatedEvent extends DomainEvent {
  constructor(
    public readonly linkId: Identifier,
    public readonly parentDocumentId: string,
    public readonly childDocumentId: string
  ) {
    super('DocumentLinkCreatedEvent');
  }
}