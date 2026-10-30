import type { Logger } from '../logger/logger';
import { createServiceToken, type ServiceToken } from '../../kernel/service-container';
import type {
  DomainEventName,
  DomainEventPayload,
} from './event-contracts';

/** Container token for the typed domain event bus. */
export const EventBusToken: ServiceToken<EventBus> = createServiceToken<EventBus>('EventBus');

type Listener<K extends DomainEventName> = (
  payload: DomainEventPayload<K>
) => void | Promise<void>;

type ErasedListener = (payload: unknown) => void | Promise<void>;

/**
 * Typed in-process event bus (Constitution §14).
 * `emit` is fire-and-forget: listener failures are logged, never propagated
 * to the emitting service. Listeners run sequentially in subscription order
 * to preserve reaction ordering.
 */
export class EventBus {
  private readonly handlers = new Map<DomainEventName, ErasedListener[]>();

  constructor(private readonly logger: Logger) {}

  emit<K extends DomainEventName>(name: K, payload: DomainEventPayload<K>): void {
    const listeners = this.handlers.get(name);
    if (!listeners || listeners.length === 0) return;

    void (async () => {
      for (const listener of listeners) {
        try {
          await listener(payload);
        } catch (error) {
          this.logger.error('event listener failed', {
            event: name,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
  }

  on<K extends DomainEventName>(name: K, listener: Listener<K>): () => void {
    const existing = this.handlers.get(name) ?? [];
    existing.push(listener as ErasedListener);
    this.handlers.set(name, existing);
    return () => this.off(name, listener);
  }

  private off<K extends DomainEventName>(name: K, listener: Listener<K>): void {
    const existing = this.handlers.get(name);
    if (!existing) return;
    const filtered = existing.filter((l) => l !== (listener as ErasedListener));
    if (filtered.length === 0) {
      this.handlers.delete(name);
    } else {
      this.handlers.set(name, filtered);
    }
  }
}