import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { Identifier } from '../../../shared-kernel/types/identifier';

export type LinkCategory = 'code' | 'doc';

export class LinkCreatedEvent extends DomainEvent {
  constructor(
    public readonly linkId: Identifier,
    public readonly category: LinkCategory,
    public readonly sourceId: string,
    public readonly targetId: string
  ) {
    super('LinkCreatedEvent');
  }
}