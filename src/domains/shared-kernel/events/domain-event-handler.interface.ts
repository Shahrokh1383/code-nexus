import { DomainEvent } from './domain-event';

export interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}