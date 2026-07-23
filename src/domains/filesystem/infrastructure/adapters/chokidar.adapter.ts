import chokidar, { FSWatcher } from 'chokidar';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { FileModifiedEvent } from '../../domain/events/file-modified';
import { FileDeletedEvent } from '../../domain/events/file-deleted';
import { FileDiscoveredEvent } from '../../domain/events/file-discovered';
import { FileNodeId } from '../../domain/value-objects/file-node-id';
import { FolderNodeId } from '../../domain/value-objects/folder-node-id';
import { FilePath } from '../../domain/value-objects/file-path';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class ChokidarAdapter {
  private watcher: FSWatcher | null = null;
  private eventBus: EventBus;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingEvents: Array<{ type: string; absolutePath: string }> = [];
  private rootPath: string = '';

  constructor() {
    this.eventBus = EventBus.getInstance();
  }
  
  startWatching(rootPath: string, ignorePatterns: IgnorePattern[]): FSWatcher {
    this.stopWatching();
    this.rootPath = PathUtils.normalize(rootPath);

    const ignored = ignorePatterns.map(p => this.toChokidarPatter(p));

    this.watcher = chokidar.watch(rootPath, {
      ignored,
      ignoreInitial: false, // Changed to false to discover existing files
      persistent: true,
      depth: Infinity,
    });

    this.watcher.on('add', (filePath) => this.queueEvent('add', filePath));
    this.watcher.on('change', (filePath) => this.queueEvent('change', filePath));
    this.watcher.on('unlink', (filePath) => this.queueEvent('unlink', filePath));
    this.watcher.on('addDir', (dirPath) => this.queueEvent('addDir', dirPath));
    this.watcher.on('unlinkDir', (dirPath) => this.queueEvent('unlinkDir', dirPath));

    return this.watcher;
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingEvents = [];
  }

  private queueEvent(type: string, absolutePath: string): void {
    this.pendingEvents.push({ type, absolutePath });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      void this.flushEvents();
    }, 300);
  }

  private async flushEvents(): Promise<void> {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];

    for (const event of events) {
      await this.processEvent(event.type, event.absolutePath);
    }
  }

  private async processEvent(type: string, absolutePath: string): Promise<void> {
    const relativePath = this.toRelativePath(absolutePath);

    try {
      switch (type) {
        case 'add': {
          const filePath = new FilePath(relativePath);
          await this.eventBus.emit(
            new FileDiscoveredEvent(
              new FileNodeId(UuidGenerator.generate()),
              filePath,
              false
            )
          );
          break;
        }
        case 'change': {
          const filePath = new FilePath(relativePath);
          await this.eventBus.emit(
            new FileModifiedEvent(
              new FileNodeId(UuidGenerator.generate()),
              filePath,
              null as any
            )
          );
          break;
        }
        case 'unlink': {
          await this.eventBus.emit(
            new FileDeletedEvent(
              new FileNodeId(UuidGenerator.generate()),
              new FilePath(relativePath)
            )
          );
          break;
        }
        case 'addDir': {
          await this.eventBus.emit(
            new FileDiscoveredEvent(
              new FolderNodeId(UuidGenerator.generate()),
              new FilePath(relativePath),
              true
            )
          );
          break;
        }
        case 'unlinkDir': {
          await this.eventBus.emit(
            new FileDeletedEvent(
              new FolderNodeId(UuidGenerator.generate()),
              new FilePath(relativePath)
            )
          );
          break;
        }
      }
    } catch {
      // Silently ignore events for paths that fail validation
    }
  }

  private toRelativePath(absolutePath: string): string {
    const normalized = PathUtils.normalize(absolutePath);
    if (normalized === this.rootPath) {
      return '.';
    }
    if (normalized.startsWith(this.rootPath + '/')) {
      return normalized.slice(this.rootPath.length + 1);
    }
    return normalized;
  }

  private toChokidarPatter(pattern: IgnorePattern): string {
    const raw = pattern.pattern;
    if (raw.includes('/') || /[*?[\]]/.test(raw)) {
      return raw;
    }

    const name = raw.endsWith('/') ? raw.slice(0, -1) : raw;
    return `**/${name}`;
  }
}