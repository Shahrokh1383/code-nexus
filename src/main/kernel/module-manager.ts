import type { ServiceContainer } from './service-container';
import type { ModuleProvider } from './module-provider';
import type { Logger } from '../shared/logger/logger';

/**
 * Runs every provider through register (all first) then boot, in registry
 * order. A failing module is fatal: bootstrap must not continue half-wired.
 */
export class ModuleManager {
  constructor(
    private readonly container: ServiceContainer,
    private readonly logger: Logger
  ) {}

  async load(providers: readonly ModuleProvider[]): Promise<void> {
    for (const provider of providers) {
      provider.register(this.container);
    }
    for (const provider of providers) {
      await provider.boot(this.container);
    }
    this.logger.info('modules loaded', { count: providers.length });
  }
}