import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { AtomicJsonFileToken } from '../../shared/persistence/atomic-json-file';
import { EventBusToken } from '../../shared/event-bus/event-bus';
import { LoggerToken } from '../../shared/logger/logger';
import { FileSystemServiceToken } from '../filesystem/services/contracts/FileSystemServiceContract';
import { DocumentServiceToken } from '../documentation';
import { LinkJsonRepository } from './infrastructure/LinkJsonRepository';
import { DocumentLinkJsonRepository } from './infrastructure/DocumentLinkJsonRepository';
import { FilesystemCodeFileQuery } from './infrastructure/FilesystemCodeFileQuery';
import { DocumentLinkValidator } from './domain/DocumentLinkValidator';
import { CodeLinkService } from './services/CodeLinkService';
import { DocumentLinkService } from './services/DocumentLinkService';
import { LinkCountUpdater } from './services/LinkCountUpdater';
import {
  CodeLinkServiceToken,
  DocumentLinkServiceToken,
  LinkCountUpdaterToken,
} from './services/tokens';
import { registerLinkingIpc } from './ipc/LinkingIpc';

export class LinkingProvider implements ModuleProvider {
  register(c: ServiceContainer): void {
    const file = c.resolve(AtomicJsonFileToken);
    const eventBus = c.resolve(EventBusToken);

    // Shared singletons per module — same instances across services.
    const linkRepo = new LinkJsonRepository(file);
    const docLinkRepo = new DocumentLinkJsonRepository(file);
    const codeFileQuery = new FilesystemCodeFileQuery(file);
    const validator = new DocumentLinkValidator(docLinkRepo);

    c.bind(CodeLinkServiceToken, () => new CodeLinkService(
      linkRepo,
      docLinkRepo,
      codeFileQuery,
      eventBus,
    ));

    c.bind(DocumentLinkServiceToken, () => new DocumentLinkService(
      docLinkRepo,
      validator,
      eventBus,
    ));

    c.bind(LinkCountUpdaterToken, () => new LinkCountUpdater(
      linkRepo,
      docLinkRepo,
      c.resolve(DocumentServiceToken),
    ));
  }

  boot(c: ServiceContainer): void {
    registerLinkingIpc(c, c.resolve(LoggerToken).child('linking:ipc'));

    const logger = c.resolve(LoggerToken).child('linking:events');
    const eventBus = c.resolve(EventBusToken);
    const activeRootPath = () => c.resolve(FileSystemServiceToken).getActiveRootPath();
    const codeLinks = () => c.resolve(CodeLinkServiceToken);
    const updater = () => c.resolve(LinkCountUpdaterToken);

    eventBus.on('DocumentDeleted', async ({ documentId }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await codeLinks().migrateFromDeletedDocument(rootPath, documentId);
      } catch (error) {
        logger.error('failed to migrate links after document deletion', {
          documentId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    eventBus.on('LinkCreated', async ({ category, targetId }) => {
      if (category !== 'code') return;
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await updater().recalculate(rootPath, targetId);
      } catch (error) {
        logger.error('failed to recalculate link count', {
          documentId: targetId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    eventBus.on('LinkBroken', async ({ category, targetId }) => {
      if (category !== 'code') return;
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await updater().recalculate(rootPath, targetId);
      } catch (error) {
        logger.error('failed to recalculate link count', {
          documentId: targetId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    eventBus.on('DocumentLinkCreated', async ({ parentDocumentId, childDocumentId }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await updater().recalculate(rootPath, parentDocumentId);
        await updater().recalculate(rootPath, childDocumentId);
      } catch (error) {
        logger.error('failed to recalculate link count', {
          parentDocumentId,
          childDocumentId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    eventBus.on('DocumentLinkBroken', async ({ parentDocumentId, childDocumentId }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        await updater().recalculate(rootPath, parentDocumentId);
        await updater().recalculate(rootPath, childDocumentId);
      } catch (error) {
        logger.error('failed to recalculate link count', {
          parentDocumentId,
          childDocumentId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}