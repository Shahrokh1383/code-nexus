import { DomainEvent } from '../../events/domain-event';
import { Identifier } from '../../types/identifier';
import { DateTime } from '../../types/date-time';

class TestEvent extends DomainEvent {
  constructor() {
    super('TestEvent');
  }
}

describe('DomainEvent', () => {
  it('should have an eventId', () => {
    const event = new TestEvent();
    expect(event.eventId).toBeInstanceOf(Identifier);
    expect(event.eventId.value).toBeDefined();
  });

  it('should have an occurredOn timestamp', () => {
    const event = new TestEvent();
    expect(event.occurredOn).toBeInstanceOf(DateTime);
  });

  it('should have the correct eventType', () => {
    const event = new TestEvent();
    expect(event.eventType).toBe('TestEvent');
  });

  it('should have unique eventIds', () => {
    const a = new TestEvent();
    const b = new TestEvent();
    expect(a.eventId.equals(b.eventId)).toBe(false);
  });
});