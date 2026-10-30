import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { LoggerToken } from '../../shared/logger/logger';
import { registerSystemIpc } from './ipc';

export class SystemProvider implements ModuleProvider {
  register(_c: ServiceContainer): void {
    // The system module holds no services — only IPC endpoints.
  }

  boot(c: ServiceContainer): void {
    registerSystemIpc(c.resolve(LoggerToken).child('system:ipc'));
  }
}