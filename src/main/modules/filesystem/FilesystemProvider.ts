import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { AtomicJsonFileToken } from '../../shared/persistence/atomic-json-file';
import { EventBusToken } from '../../shared/event-bus/event-bus';
import { LoggerToken } from '../../shared/logger/logger';
import { FileSystemService } from './services/FileSystemService';
import { FileSystemServiceToken } from './services/contracts/FileSystemServiceContract';
import { WorkspaceServiceToken } from '../workspace/services/contracts/WorkspaceServiceContract';
import { RendererBridge } from './infrastructure/renderer-bridge';
import { registerFilesystemIpc } from './ipc';

export class FilesystemProvider implements ModuleProvider {
  register(c: ServiceContainer): void {
    c.bind(FileSystemServiceToken, (container) => {
      const logger = container.resolve(LoggerToken).child('filesystem');
      return new FileSystemService(
        container.resolve(AtomicJsonFileToken),
        container.resolve(EventBusToken),
        logger,
        () => container.resolve(WorkspaceServiceToken)
      );
    });
  }

  boot(c: ServiceContainer): void {
    const logger = c.resolve(LoggerToken).child('filesystem');
    const eventBus = c.resolve(EventBusToken);
    const service = () => c.resolve(FileSystemServiceToken);

    registerFilesystemIpc(c, logger.child('ipc'));

    // Renderer realtime bridge: file events → debounced tree-updated push.
    const bridge = new RendererBridge(eventBus, logger.child('bridge'), () =>
      service().getActiveRootPath() !== null
    );
    bridge.subscribe();

    // Ignore-pattern changes rebuild the session (reconcile + purge + watcher
    // restart) — ports the legacy watcher-lifecycle reaction.
    eventBus.on('IgnorePatternsChanged', async ({ workspaceId }) => {
      const active = service().getActiveRootPath();
      if (active === null || active !== workspaceId) {
        return;
      }
      const patterns = await c.resolve(WorkspaceServiceToken).getIgnorePatterns(workspaceId);
      await service().activateSession(workspaceId, patterns);
    });

    logger.info('filesystem module booted');
  }
}