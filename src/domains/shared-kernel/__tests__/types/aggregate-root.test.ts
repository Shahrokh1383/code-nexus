import { AggregateRoot } from '../../types/aggregate-root';
import { DomainEvent } from '../../events/domain-event';

// Concrete stub to test the abstract AggregateRoot
class StubAggregate extends AggregateRoot {
  public triggerEvent(event: DomainEvent): void {
    this.registerEvent(event);
  }
}

class TestEvent extends DomainEvent {
  constructor(public readonly data: string) {
    super('TestEvent');
  }
}

describe('AggregateRoot', () => {
  let aggregate: StubAggregate;

  beforeEach(() => {
    aggregate = new StubAggregate();
  });

  it('should start with no domain events', () => {
    expect(aggregate.getDomainEvents()).toEqual([]);
  });

  it('should register a domain event', () => {
    const event = new TestEvent('hello');
    aggregate.triggerEvent(event);
    expect(aggregate.getDomainEvents()).toHaveLength(1);
    expect(aggregate.getDomainEvents()[0]).toBe(event);
  });

  it('should register multiple domain events in order', () => {
    const e1 = new TestEvent('first');
    const e2 = new TestEvent('second');
    aggregate.triggerEvent(e1);
    aggregate.triggerEvent(e2);

    const events = aggregate.getDomainEvents();
    expect(events).toHaveLength(2);
    expect(events[0].data).toBe('first');
    expect(events[1].data).toBe('second');
  });

  it('should clear all domain events', () => {
    aggregate.triggerEvent(new TestEvent('x'));
    aggregate.clearDomainEvents();
    expect(aggregate.getDomainEvents()).toEqual([]);
  });

  it('should return a copy of the internal events array', () => {
    aggregate.triggerEvent(new TestEvent('x'));
    const events = aggregate.getDomainEvents();
    events.push(new TestEvent('y')); // mutate the returned array

    expect(aggregate.getDomainEvents()).toHaveLength(1);
  });

  it('should support multiple clear cycles', () => {
    aggregate.triggerEvent(new TestEvent('a'));
    aggregate.clearDomainEvents();
    expect(aggregate.getDomainEvents()).toHaveLength(0);

    aggregate.triggerEvent(new TestEvent('b'));
    expect(aggregate.getDomainEvents()).toHaveLength(1);
  });
});