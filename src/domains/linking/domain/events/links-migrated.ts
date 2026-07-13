import { DomainEvent } from '../../../shared-kernel/events/domain-event';

export class LinksMigratedEvent extends DomainEvent {
  constructor(
    public readonly parentDocumentId: string,
    public readonly childDocumentIds: string[],
    public readonly migratedLinkIds: string[]
  ) {
    super('LinksMigratedEvent');
  }
}