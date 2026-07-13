import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { Identifier } from '../../../shared-kernel/types/identifier';
import { LinkCategory } from './link-created';

export class LinkBrokenEvent extends DomainEvent {
  constructor(
    public readonly linkId: Identifier,
    public readonly category: LinkCategory,
    public readonly sourceId: string,
    public readonly targetId: string
  ) {
    super('LinkBrokenEvent');
  }
}