import { randomUUID } from 'crypto';
import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { AtomicJsonFileToken } from '../../shared/persistence/atomic-json-file';
import { EventBusToken } from '../../shared/event-bus/event-bus';
import { LoggerToken } from '../../shared/logger/logger';
import { WorkspaceServiceToken } from '../workspace';
import { FileSystemServiceToken } from '../filesystem/services/contracts/FileSystemServiceContract';
import { DocsFolderDetector } from './domain/DocsFolderDetector';
import { DocumentScanner } from './infrastructure/DocumentScanner';
import { DocumentJsonRepository } from './infrastructure/DocumentJsonRepository';
import { DocsFolderConfigStore } from './infrastructure/DocsFolderConfigStore';
import { DocumentFileDeleter } from './infrastructure/DocumentFileDeleter';
import { DocumentService } from './services/DocumentService';
import { DocsFolderService } from './services/DocsFolderService';
import { DocumentServiceToken, DocsFolderServiceToken } from './services/tokens';
import { registerDocumentationIpc } from './ipc/DocumentationIpc';

export class DocumentationProvider implements ModuleProvider {
  register(c: ServiceContainer): void {
    const logger = c.resolve(LoggerToken).child('documentation');
    const generateId = () => randomUUID();

    const configStore = new DocsFolderConfigStore(c.resolve(AtomicJsonFileToken));
    const documentStore = new DocumentJsonRepository(
      c.resolve(AtomicJsonFileToken),
      logger.child('document-store')
    );
    const scanner = new DocumentScanner(logger.child('scanner'));
    const detector = new DocsFolderDetector(c.resolve(EventBusToken), generateId);

    c.bind(DocumentServiceToken, () => new DocumentService(
      configStore,
      documentStore,
      new DocumentFileDeleter(),
      c.resolve(EventBusToken)
    ));

    c.bind(DocsFolderServiceToken, () => new DocsFolderService(
      configStore,
      documentStore,
      scanner,
      detector,
      () => c.resolve(WorkspaceServiceToken),
      c.resolve(EventBusToken),
      generateId
    ));
  }

  boot(c: ServiceContainer): void {
    registerDocumentationIpc(c, c.resolve(LoggerToken).child('documentation:ipc'));
    const logger = c.resolve(LoggerToken).child('documentation:cleanup');
    const eventBus = c.resolve(EventBusToken);
    const folders = () => c.resolve(DocsFolderServiceToken);
    const activeRootPath = () => c.resolve(FileSystemServiceToken).getActiveRootPath();

    eventBus.on('FileDeleted', async ({ path }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await folders().cleanupDeletedFile(rootPath, path);
      } catch (error) {
        logger.warn('document cleanup on file delete failed', {
          path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    eventBus.on('FileDiscovered', async ({ path }) => {
      if (path !== '.') return;
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await folders().syncFiles(rootPath);
      } catch (error) {
        logger.warn('cold-start documents sync failed', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}