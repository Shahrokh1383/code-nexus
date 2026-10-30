/**
 * Thin generic dependency container
 * Singletons by default; synchronous factories; zero module knowledge.
 *
 * `ServiceToken` brands a plain symbol with its service type so `resolve<T>`
 * infers T from the token. The brand is compile-time only — at runtime every
 * token is a plain symbol.
 */
export type ServiceToken<T> = symbol & { readonly __serviceType?: T };

export interface ServiceContainer {
  bind<T>(token: ServiceToken<T>, factory: (c: ServiceContainer) => T): void;
  resolve<T>(token: ServiceToken<T>): T;
}

export function createServiceToken<T>(description: string): ServiceToken<T> {
  return Symbol(description) as ServiceToken<T>;
}

export class ServiceContainerImpl implements ServiceContainer {
  private readonly factories = new Map<ServiceToken<unknown>, (c: ServiceContainer) => unknown>();
  private readonly instances = new Map<ServiceToken<unknown>, unknown>();

  bind<T>(token: ServiceToken<T>, factory: (c: ServiceContainer) => T): void {
    if (this.factories.has(token)) {
      throw new Error(`Service token already bound: ${String(token.description)}`);
    }
    this.factories.set(token, factory as (c: ServiceContainer) => unknown);
  }

  resolve<T>(token: ServiceToken<T>): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`No factory bound for token: ${String(token.description)}`);
    }
    const instance = factory(this);
    this.instances.set(token, instance);
    return instance as T;
  }
}