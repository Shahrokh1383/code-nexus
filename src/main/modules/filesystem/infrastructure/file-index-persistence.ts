import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { Logger } from '../../../shared/logger/logger';
import type { FileIndexFile } from './file-index-types';

const DEBOUNCE_MS = 300;

export class FileIndexPersistence {
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private scanInProgress = false;

  constructor(
    private readonly filePath: string,
    private readonly file: AtomicJsonFile,
    private readonly logger: Logger,
    private readonly getSnapshot: () => FileIndexFile | null
  ) {}

  isDirty(): boolean {
    return this.dirty;
  }

  markDirty(): void {
    this.dirty = true;
  }

  markScanStart(): void {
    this.scanInProgress = true;
  }

  markScanEnd(): void {
    this.scanInProgress = false;
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
  }

  async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.getSnapshot() && this.dirty) {
      this.dirty = false;
      await this.writeIndex();
    }
  }

  scheduleWrite(): void {
    if (this.scanInProgress) return;
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      if (this.getSnapshot() && this.dirty) {
        this.dirty = false;
        this.writeIndex().catch((error: unknown) => {
          this.logger.error('file-index debounced write failed', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }, DEBOUNCE_MS);
  }

  async writeIndex(): Promise<void> {
    const snapshot = this.getSnapshot();
    if (!snapshot) return;
    try {
      await this.file.writeJson(this.filePath, snapshot);
      this.logger.debug('file-index written', {
        path: this.filePath,
        entries: Object.keys(snapshot.files).length,
        lastScan: snapshot.lastScan,
        cleanExit: snapshot.cleanExit,
      });
    } catch (error) {
      this.logger.error('file-index write failed', {
        path: this.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}