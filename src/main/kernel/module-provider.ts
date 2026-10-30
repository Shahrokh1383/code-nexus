import type { ServiceContainer } from './service-container';

/**
 * Every module exposes exactly one provider with a two-phase lifecycle
 * (Constitution §6): `register` wires synchronous bindings, `boot` wires
 * IPC handlers, event subscriptions, and lifecycle services.
 */
export interface ModuleProvider {
  register(c: ServiceContainer): void;
  boot(c: ServiceContainer): void | Promise<void>;
}