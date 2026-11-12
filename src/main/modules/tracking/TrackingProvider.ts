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

export class TrackingProvider implements ModuleProvider {
  private hashRepo!: TrackingJsonRepository;

  register(c: ServiceContainer): void {
    const file = c.resolve(AtomicJsonFileToken);
    const events = c.resolve(EventBusToken);
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
    ));
    c.bind(QueryServiceToken, () => new QueryService(
      this.hashRepo, commitRepo, approvalRepo, cacheRepo, linkedQuery,
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
      const normalized = path.replace(/\\/g, '/');
      if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
      try { await tracking().detectChanges(rootPath, normalized); }
      catch (err) {
        logger.error('FileModified handler failed', {
          path: normalized, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileDiscovered', async ({ path, isDirectory }) => {
      if (isDirectory) return;
      const rootPath = activeRootPath();
      if (!rootPath) return;
      const normalized = path.replace(/\\/g, '/');
      if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
      try { await tracking().detectChanges(rootPath, normalized); }
      catch (err) {
        logger.error('FileDiscovered handler failed', {
          path: normalized, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileDeleted', async ({ path }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      const normalized = path.replace(/\\/g, '/');
      if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
      try {
        await this.hashRepo.deleteHashByPath(rootPath, new TrackedFilePath(normalized));
      } catch (err) {
        logger.error('FileDeleted handler failed', {
          path: normalized, message: err instanceof Error ? err.message : String(err),
        });
      }
    });

    events.on('FileExcluded', async ({ path }) => {
      const rootPath = activeRootPath();
      if (!rootPath) return;
      const normalized = path.replace(/\\/g, '/');
      try {
        await this.hashRepo.deleteHashByPath(rootPath, new TrackedFilePath(normalized));
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
        await this.hashRepo.deleteAllExcept(rootPath, new Set(filePaths));
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
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
        await tracking().detectChanges(rootPath, normalized);
      } catch (err) {
        logger.error('LinkCreated handler failed', {
          sourceId, message: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }
}