import { BrowserWindow, app } from 'electron';
import type { ModuleProvider } from '../../kernel/module-provider';
import type { ServiceContainer } from '../../kernel/service-container';
import { AtomicJsonFileToken } from '../../shared/persistence/atomic-json-file';
import { EventBusToken } from '../../shared/event-bus/event-bus';
import { LoggerToken } from '../../shared/logger/logger';
import { FileSystemServiceToken } from '../filesystem/services/contracts/FileSystemServiceContract';
import { CodeLinkServiceToken } from '../linking/services/tokens';
import { TrackingJsonRepository } from './infrastructure/TrackingJsonRepository';
import { CommitsJsonRepository } from './infrastructure/CommitsJsonRepository';
import { DocumentCommitApprovalJsonRepository } from './infrastructure/DocumentCommitApprovalJsonRepository';
import { BaselineDiffCacheJsonRepository } from './infrastructure/BaselineDiffCacheJsonRepository';
import { FileSystemContentReader } from './infrastructure/FileSystemContentReader';
import { DiffCalculator } from './infrastructure/DiffCalculator';
import { LinkedDocumentQuery } from './infrastructure/LinkedDocumentQuery';
import { TrackingBridge } from './infrastructure/TrackingBridge';
import { TrackingService } from './services/TrackingService';
import { QueryService } from './services/QueryService';
import { TrackingServiceToken, QueryServiceToken, LinkedDocumentQueryToken } from './services/tokens';
import { registerTrackingIpc } from './ipc/TrackingIpc';
import { TrackedFilePath } from './domain/TrackedFilePath';

function toRelative(rootPath: string, raw: string): string {
  const rootN = rootPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  let p = raw.replace(/\\/g, '/');
  const pLower = p.toLowerCase();
  if (pLower.startsWith(rootN + '/')) p = p.slice(rootN.length + 1);
  if (p.startsWith('./')) p = p.slice(2);
  return p;
}

export class TrackingProvider implements ModuleProvider {
  private hashRepo!: TrackingJsonRepository;

  register(c: ServiceContainer): void {
    const file = c.resolve(AtomicJsonFileToken);
    const events = c.resolve(EventBusToken);
    const logger = c.resolve(LoggerToken);
    const userDataPath = app.getPath('userData');

    this.hashRepo = new TrackingJsonRepository(file);
    const commitRepo = new CommitsJsonRepository(file);
    const approvalRepo = new DocumentCommitApprovalJsonRepository(file);
    const cacheRepo = new BaselineDiffCacheJsonRepository(file, userDataPath);
    const contentReader = new FileSystemContentReader();
    const diffCalc = new DiffCalculator();
    const linkedQuery = new LinkedDocumentQuery(c.resolve(CodeLinkServiceToken));

    c.bind(LinkedDocumentQueryToken, () => linkedQuery);

    c.bind(TrackingServiceToken, () => new TrackingService(
      this.hashRepo, commitRepo, approvalRepo, cacheRepo,
      contentReader, diffCalc, linkedQuery, events,
      logger.child('tracking.service')
    ));

    c.bind(QueryServiceToken, () => new QueryService(
      this.hashRepo, commitRepo, approvalRepo, cacheRepo, linkedQuery,
      contentReader, diffCalc,
    ));
  }

  boot(c: ServiceContainer): void {
    const logger = c.resolve(LoggerToken).child('tracking');
    const events = c.resolve(EventBusToken);
    const activeRootPath = (): string | null =>
      c.resolve(FileSystemServiceToken).getActiveRootPath();
    const tracking = () => c.resolve(TrackingServiceToken);
    const linkedQuery = () => c.resolve(LinkedDocumentQueryToken);

    registerTrackingIpc(c, logger.child('ipc'));

    const send = (channel: string, payload: unknown): void => {
      const [win] = BrowserWindow.getAllWindows();
      if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    };
    new TrackingBridge(events, logger.child('bridge'), () => activeRootPath() !== null, send)
      .subscribe();

    events.on('ChangesDetected', async ({ filePath }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        const documentIds = await linkedQuery().findLinkedDocuments(rootPath, filePath);
        for (const documentId of documentIds) {
          events.emit('ReviewRequired', { documentId, filePath, changeType: 'OUTDATED' });
        }
      } catch (err) {
        logger.error('ChangesDetected handler failed', {
          filePath, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileModified', async ({ path }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        if (!path) {
          logger.warn('FileModified received without path', {});
          return;
        }
        const normalized = toRelative(rootPath, path);
        if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
        await tracking().detectChanges(rootPath, normalized);
      } catch (err) {
        logger.error('FileModified handler failed', {
          path, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileDiscovered', async ({ path, isDirectory }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      if (isDirectory) {
        if (path === '.') {
          try {
            await tracking().reconcileOnBoot(rootPath);
          } catch (err) {
            logger.error('FileDiscovered boot reconcile failed', {
              path,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
        return;
      }
      try {
        if (!path) return;
        const normalized = toRelative(rootPath, path);
        if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
        await tracking().detectChanges(rootPath, normalized);
      } catch (err) {
        logger.error('FileDiscovered handler failed', {
          path, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileDeleted', async ({ path }) => {
      const rootPath = activeRootPath();
      if (!rootPath || !path) return;
      const normalized = toRelative(rootPath, path);
      try {
        await this.hashRepo.deleteHashByPath(rootPath, new TrackedFilePath(normalized));
        await this.hashRepo.flush(rootPath);
      } catch (err) {
        logger.error('FileDeleted handler failed', {
          path: normalized, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileExcluded', async ({ path }) => {
      const rootPath = activeRootPath();
      if (!rootPath || !path) return;
      const normalized = toRelative(rootPath, path);
      try {
        await this.hashRepo.deleteHashByPath(rootPath, new TrackedFilePath(normalized));
        await this.hashRepo.flush(rootPath);
      } catch (err) {
        logger.error('FileExcluded handler failed', {
          path: normalized, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileIndexRebuilt', async ({ filePaths }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        const normalized = new Set(filePaths.map((p) => toRelative(rootPath, p)));
        await this.hashRepo.deleteAllExcept(rootPath, normalized);
        await this.hashRepo.flush(rootPath);

        const codeLinkService = c.resolve(CodeLinkServiceToken);
        const allLinks = await codeLinkService.getAllLinks(rootPath);
        const linkedFiles = new Set(allLinks.map((l) => l.codeFilePath));
        for (const filePath of linkedFiles) {
          if (filePath.startsWith('.doclink/') || filePath === '.doclink') continue;
          await tracking().detectChanges(rootPath, filePath);
        }
      } catch (err) {
        logger.error('FileIndexRebuilt handler failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('LinkCreated', async ({ category, sourceId }) => {
      if (category !== 'code') return;
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        const filePath = await linkedQuery().findFilePathByFileId(rootPath, sourceId);
        if (!filePath) return;
        const normalized = toRelative(rootPath, filePath);
        if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
        await tracking().detectChanges(rootPath, normalized);
        await this.hashRepo.updatePendingStatus(
          rootPath, new TrackedFilePath(normalized), true,
        );
        await this.hashRepo.flush(rootPath);
        logger.debug('LinkCreated: pending reset on link', {
          filePath: normalized, sourceId,
        });
      } catch (err) {
        logger.error('LinkCreated handler failed', {
          sourceId, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('LinkBroken', async ({ category, sourceId }) => {
      if (category !== 'code') return;
      const rootPath = activeRootPath();
      if (!rootPath) return;
      try {
        const filePath = await linkedQuery().findFilePathByFileId(rootPath, sourceId);
        if (!filePath) return;
        const normalized = toRelative(rootPath, filePath);
        if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

        const remaining = await linkedQuery().findLinkedDocuments(rootPath, normalized);
        if (remaining.length > 0) {
          logger.debug('LinkBroken: file still linked elsewhere, keeping tracking', {
            filePath: normalized, remaining: remaining.length, sourceId,
          });
          return;
        }

        await this.hashRepo.deleteHashByPath(rootPath, new TrackedFilePath(normalized));
        await this.hashRepo.flush(rootPath);
        logger.debug('LinkBroken: orphaned tracking entry removed', {
          filePath: normalized, sourceId,
        });
      } catch (err) {
        logger.error('LinkBroken handler failed', {
          sourceId, message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }
}