import { DomainEvent } from './domain-event';
import { IDomainEventHandler } from './domain-event-handler.interface';

type HandlerMap = Map<string, Array<IDomainEventHandler<DomainEvent>>>;

export class EventBus {
  private static _instance: EventBus | null = null;
  private _handlers: HandlerMap = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (EventBus._instance === null) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  register<T extends DomainEvent>(
    eventType: string,
    handler: IDomainEventHandler<T>
  ): void {
    const existing = this._handlers.get(eventType) ?? [];
    existing.push(handler as IDomainEventHandler<DomainEvent>);
    this._handlers.set(eventType, existing);
  }

  async emit(event: DomainEvent): Promise<void> {
    const handlers = this._handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      await handler.handle(event);
    }
  }

  clear(): void {
    this._handlers.clear();
  }
}