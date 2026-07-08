import { randomUUID } from 'crypto';
import { Identifier } from '../types/identifier';
import { DateTime } from '../types/date-time';

export abstract class DomainEvent {
  readonly eventId: Identifier;
  readonly occurredOn: DateTime;
  readonly eventType: string;

  protected constructor(eventType: string) {
    this.eventId = new Identifier(randomUUID());
    this.occurredOn = DateTime.now();
    this.eventType = eventType;
  }
}