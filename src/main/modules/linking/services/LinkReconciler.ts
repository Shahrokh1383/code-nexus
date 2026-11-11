import type { Logger } from '../../../shared/logger/logger';
import type { FilesystemCodeFileQuery } from '../infrastructure/FilesystemCodeFileQuery';
import type { LinkJsonRepository } from '../infrastructure/LinkJsonRepository';
import type { LinkCountUpdater } from './LinkCountUpdater';

const DEBOUNCE_MS = 500;

/**
 * Reconciles code-to-document links against the filesystem file-index.
 * Triggered by FileDeleted (live), FileExcluded (ignore-pattern), and
 * FileDiscovered({ path: '.' }) (cold-start scan completion).
 *
 * codeFileId is a per-entry UUID (FilesystemCodeFileQuery → FileIndexEntry.id
 * → randomUUID on every upsert). After a code file is deleted, no reverse
 * path→id mapping exists, so the only correct cleanup primitive is
 * set-difference: any link whose codeFileId is absent from the current index
 * is dead and is removed.
 *
 * All triggers coalesce into one debounced run. A single in-flight reconcile
 * per workspace is enforced; any trigger fired during a run schedules exactly
 * one follow-up. This bounds work to O(file-index size + link count) even
 * when a cold-start scan fires one FileDeleted and one FileDiscovered in
 * quick succession.
 */
export class LinkReconciler {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private pending = false;
  private pendingRootPath: string | null = null;

  constructor(
    private readonly linkRepo: LinkJsonRepository,
    private readonly codeFileQuery: FilesystemCodeFileQuery,
    private readonly updater: LinkCountUpdater,
    private readonly logger: Logger
  ) {}

  schedule(rootPath: string): void {
    this.pendingRootPath = rootPath;
    if (this.inFlight) {
      this.pending = true;
      return;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.run();
    }, DEBOUNCE_MS);
  }

  private async run(): Promise<void> {
    if (this.inFlight) {
      this.pending = true;
      return;
    }
    const rootPath = this.pendingRootPath;
    if (!rootPath) return;
    this.pending = false;
    this.inFlight = this.reconcile(rootPath).finally(() => {
      this.inFlight = null;
      if (this.pending && this.pendingRootPath) {
        this.pending = false;
        this.schedule(this.pendingRootPath);
      }
    });
    await this.inFlight;
  }

  private async reconcile(rootPath: string): Promise<void> {
    const start = Date.now();
    try {
      const currentFiles = await this.codeFileQuery.getAllCodeFiles(rootPath);
      const currentIds = new Set(currentFiles.map((f) => f.id));
      const allLinks = await this.linkRepo.findAll(rootPath);
      const dead = allLinks.filter((l) => !currentIds.has(l.codeFileId));
      if (dead.length === 0) {
        this.logger.debug('link reconcile: no drift', { rootPath });
        return;
      }
      await this.linkRepo.deleteMany(
        rootPath,
        dead.map((l) => l.id)
      );
      const affectedDocs = new Set(dead.map((l) => l.documentId));
      for (const docId of affectedDocs) {
        try {
          await this.updater.recalculate(rootPath, docId);
        } catch (error) {
          this.logger.warn('link count recalc failed', {
            rootPath,
            documentId: docId,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      this.logger.info('link reconcile finalized', {
        rootPath,
        deadRemoved: dead.length,
        affectedDocuments: affectedDocs.size,
        totalMs: Date.now() - start,
      });
    } catch (error) {
      this.logger.error('link reconcile failed', {
        rootPath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}