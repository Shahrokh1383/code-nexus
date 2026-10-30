import { app, BrowserWindow } from 'electron';
import { ServiceContainerImpl, type ServiceContainer } from '../kernel/service-container';
import { ModuleManager } from '../kernel/module-manager';
import { Logger, LoggerToken } from '../shared/logger/logger';
import { EventBus, EventBusToken } from '../shared/event-bus/event-bus';
import { AtomicJsonFile, AtomicJsonFileToken } from '../shared/persistence/atomic-json-file';
import { WindowManager } from './window-manager';
import { enabledModuleProviders } from '../config/modules';

function registerSharedServices(container: ServiceContainer): void {
  container.bind(LoggerToken, () => Logger.create('main'));
  container.bind(EventBusToken, (c) => new EventBus(c.resolve(LoggerToken)));
  container.bind(AtomicJsonFileToken, (c) => new AtomicJsonFile(c.resolve(LoggerToken).child('persistence')));
}

async function bootstrap(): Promise<void> {
  const container = new ServiceContainerImpl();
  registerSharedServices(container);

  const logger = container.resolve(LoggerToken);
  const windowManager = new WindowManager(logger.child('window'));

  await new ModuleManager(container, logger.child('modules')).load(enabledModuleProviders);
  windowManager.createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
}

app.whenReady().then(async () => {
  try {
    await bootstrap();
  } catch (error) {
    // Bootstrap failure is fatal — log it and exit cleanly (Constitution §15).
    try {
      const logger = Logger.create('bootstrap');
      logger.fatal('bootstrap failed', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } catch {
      // Logging itself failed — nothing left to do.
    }
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});