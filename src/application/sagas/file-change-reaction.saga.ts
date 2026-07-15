import { EventBus } from '../../domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../domains/shared-kernel/events/domain-event-handler.interface';
import { FileModifiedEvent } from '../../domains/filesystem/domain/events/file-modified';
import { FileDiscoveredEvent } from '../../domains/filesystem/domain/events/file-discovered';
import { FileExcludedEvent } from '../../domains/filesystem/domain/events/file-excluded';
import { IgnorePatternsChangedEvent } from '../../domains/filesystem/domain/events/ignore-patterns-changed';
import { ChangesDetectedEvent } from '../../domains/tracking/domain/events/changes-detected';
import { ReviewRequiredEvent } from '../../domains/tracking/domain/events/review-required';
import { DetectChangesCommand } from '../../domains/tracking/application/commands/detect-changes.command';
import { DetectChangesHandler } from '../../domains/tracking/application/handlers/detect-changes.handler';
import { RecordHashHandler } from '../../domains/tracking/application/handlers/record-hash.handler';
import { TrackingJsonRepository } from '../../domains/tracking/infrastructure/repository/tracking-json.repository';
import { FileContentReaderAdapter } from '../../domains/tracking/infrastructure/adapters/file-content-reader.adapter';
import { ILinkedDocumentQueryPort } from '../../domains/tracking/application/ports/linked-document-query.port';
import { IFileSystemRepository } from '../../domains/filesystem/domain/repository/filesystem-repository.interface';
import { DiffCalculatorAdapter } from '../../domains/tracking/infrastructure/adapters/diff-calculator.adapter';
import { DiffCalculatorService } from '../../domains/tracking/domain/services/diff-calculator.service';
import { FileNode } from '../../domains/filesystem/domain/entities/file-node';

export class FileChangeReactionSaga {
  private readonly eventBus: EventBus;
  private readonly workspaceRoot: string;
  private readonly linkedDocQuery: ILinkedDocumentQueryPort;
  private readonly fileSystemRepo: IFileSystemRepository;

  private readonly fileModifiedHandler: IDomainEventHandler<FileModifiedEvent>;
  private readonly fileDiscoveredHandler: IDomainEventHandler<FileDiscoveredEvent>;
  private readonly fileExcludedHandler: IDomainEventHandler<FileExcludedEvent>;
  private readonly ignorePatternsChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent>;
  private readonly changesDetectedHandler: IDomainEventHandler<ChangesDetectedEvent>;

  constructor(
    workspaceRoot: string,
    linkedDocQuery: ILinkedDocumentQueryPort,
    fileSystemRepo: IFileSystemRepository
  ) {
    this.eventBus = EventBus.getInstance();
    this.workspaceRoot = workspaceRoot;
    this.linkedDocQuery = linkedDocQuery;
    this.fileSystemRepo = fileSystemRepo;

    this.fileModifiedHandler = {
      handle: async (event: FileModifiedEvent): Promise<void> => {
        await this.onFileChanged(event.path.value);
      },
    };

    this.fileDiscoveredHandler = {
      handle: async (event: FileDiscoveredEvent): Promise<void> => {
        if (!event.isDirectory) {
          await this.onFileChanged(event.path.value);
        }
      },
    };

    this.fileExcludedHandler = {
      handle: async (event: FileExcludedEvent): Promise<void> => {
        await this.onFileExcluded(event);
      },
    };

    this.ignorePatternsChangedHandler = {
      handle: async (_event: IgnorePatternsChangedEvent): Promise<void> => {
        await this.onIgnorePatternsChanged();
      },
    };

    this.changesDetectedHandler = {
      handle: async (event: ChangesDetectedEvent): Promise<void> => {
        await this.onChangesDetected(event);
      },
    };
  }

  register(): void {
    this.eventBus.register('FileModified', this.fileModifiedHandler);
    this.eventBus.register('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.register('FileExcluded', this.fileExcludedHandler);
    this.eventBus.register('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.register('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  unregister(): void {
    this.eventBus.unregister('FileModified', this.fileModifiedHandler);
    this.eventBus.unregister('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.unregister('FileExcluded', this.fileExcludedHandler);
    this.eventBus.unregister('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.unregister('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  private async onFileChanged(filePath: string): Promise<void> {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') {
      return;
    }

    const repository = new TrackingJsonRepository(this.workspaceRoot);
    const contentReader = new FileContentReaderAdapter(this.workspaceRoot);
    const diffAdapter = new DiffCalculatorAdapter();
    const diffService = new DiffCalculatorService(diffAdapter);
    const recordHandler = new RecordHashHandler(repository, diffService, contentReader);
    const handler = new DetectChangesHandler(contentReader, recordHandler);

    await handler.execute(new DetectChangesCommand(filePath));
  }

  private async onFileExcluded(event: FileExcludedEvent): Promise<void> {
    const repository = new TrackingJsonRepository(this.workspaceRoot);
    await repository.deleteHashByPath(event.path);
  }

  private async onIgnorePatternsChanged(): Promise<void> {
    // Synchronize tracking index with current file index after ignore patterns change
    const allNodes = await this.fileSystemRepo.findAll();
    const currentFilePaths = new Set<string>();
    for (const node of allNodes) {
      if (node instanceof FileNode) {
        currentFilePaths.add(node.path.value);
      }
    }

    const trackingRepo = new TrackingJsonRepository(this.workspaceRoot);
    await trackingRepo.deleteAllExcept(currentFilePaths);
  }

  private async onChangesDetected(event: ChangesDetectedEvent): Promise<void> {
    const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(event.filePath.value);
    for (const docId of linkedDocs) {
      await this.eventBus.emit(new ReviewRequiredEvent(docId, event.filePath, 'OUTDATED'));
    }
  }
}