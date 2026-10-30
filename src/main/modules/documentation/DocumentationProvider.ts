import { randomUUID } from 'crypto';
import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { AtomicJsonFileToken } from '../../shared/persistence/atomic-json-file';
import { EventBusToken } from '../../shared/event-bus/event-bus';
import { LoggerToken } from '../../shared/logger/logger';
import { WorkspaceServiceToken } from '../workspace';
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

    // Single shared instances — the document cache + debounced flush and the
    // config RMW queue must never be duplicated across services.
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
  }
}