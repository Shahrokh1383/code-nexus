import { EventBus } from '../../events/event-bus';
import { DomainEvent } from '../../events/domain-event';
import { IDomainEventHandler } from '../../events/domain-event-handler.interface';

class MockEvent extends DomainEvent {
  constructor() {
    super('MockEvent');
  }
}

class MockHandler implements IDomainEventHandler<MockEvent> {
  handled = false;

  async handle(_event: MockEvent): Promise<void> {
    this.handled = true;
  }
}

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.getInstance().clear();
  });

  it('should be a singleton', () => {
    const a = EventBus.getInstance();
    const b = EventBus.getInstance();
    expect(a).toBe(b);
  });

  it('should register and emit events', async () => {
    const bus = EventBus.getInstance();
    const handler = new MockHandler();
    bus.register('MockEvent', handler);

    await bus.emit(new MockEvent());
    expect(handler.handled).toBe(true);
  });

  it('should execute multiple handlers', async () => {
    const bus = EventBus.getInstance();
    const h1 = new MockHandler();
    const h2 = new MockHandler();
    bus.register('MockEvent', h1);
    bus.register('MockEvent', h2);

    await bus.emit(new MockEvent());
    expect(h1.handled).toBe(true);
    expect(h2.handled).toBe(true);
  });

  it('should not fail with no handlers', async () => {
    const bus = EventBus.getInstance();
    await expect(bus.emit(new MockEvent())).resolves.not.toThrow();
  });
});