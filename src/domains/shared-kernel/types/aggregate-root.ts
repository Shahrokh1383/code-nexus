import { DomainEvent } from '../events/domain-event';

/**
 * Base class for all Aggregate Roots in the CodeNexus domain.
 * Handles the collection and clearing of domain events to be dispatched by the Application Layer.
 */
export abstract class AggregateRoot {
  private _events: DomainEvent[] = [];

  protected registerEvent(event: DomainEvent): void {
    this._events.push(event);
  }

  public getDomainEvents(): DomainEvent[] {
    return [...this._events];
  }

  public clearDomainEvents(): void {
    this._events = [];
  }
}