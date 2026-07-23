import { EventBus } from '../../domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../domains/shared-kernel/events/domain-event-handler.interface';
import { FileModifiedEvent } from '../../domains/filesystem/domain/events/file-modified';
import { FileDiscoveredEvent } from '../../domains/filesystem/domain/events/file-discovered';
import { FileExcludedEvent } from '../../domains/filesystem/domain/events/file-excluded';
import { IgnorePatternsChangedEvent } from '../../domains/filesystem/domain/events/ignore-patterns-changed';
import { FileIndexRebuiltEvent } from '../../domains/filesystem/domain/events/file-index-rebuilt';
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
import { FileNodeId } from '../../domains/filesystem/domain/value-objects/file-node-id';
import { FilePath } from '../../domains/filesystem/domain/value-objects/file-path';
import { FileSize } from '../../domains/filesystem/domain/value-objects/file-size';
import { FileHash } from '../../domains/filesystem/domain/value-objects/file-hash';
import { DateTime } from '../../domains/shared-kernel/types/date-time';
import { Maybe } from '../../domains/shared-kernel/types/maybe';
import { UuidGenerator } from '../../domains/shared-kernel/utils/uuid-generator';

export class FileChangeReactionSaga {
  private readonly eventBus: EventBus;
  private readonly workspaceRoot: string;
  private readonly linkedDocQuery: ILinkedDocumentQueryPort;
  private readonly fileSystemRepo: IFileSystemRepository;

  // Pre-instantiated to prevent memory leaks and CPU spikes on every file event
  private readonly trackingRepo: TrackingJsonRepository;
  private readonly contentReader: FileContentReaderAdapter;
  private readonly detectChangesHandler: DetectChangesHandler;

  private readonly fileModifiedHandler: IDomainEventHandler<FileModifiedEvent>;
  private readonly fileDiscoveredHandler: IDomainEventHandler<FileDiscoveredEvent>;
  private readonly fileExcludedHandler: IDomainEventHandler<FileExcludedEvent>;
  private readonly ignorePatternsChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent>;
  private readonly fileIndexRebuiltHandler: IDomainEventHandler<FileIndexRebuiltEvent>;
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

    // Initialize dependencies ONCE
    this.trackingRepo = new TrackingJsonRepository(this.workspaceRoot);
    this.contentReader = new FileContentReaderAdapter(this.workspaceRoot);
    const diffAdapter = new DiffCalculatorAdapter();
    const diffService = new DiffCalculatorService(diffAdapter);
    const recordHandler = new RecordHashHandler(this.trackingRepo, diffService, this.contentReader);
    this.detectChangesHandler = new DetectChangesHandler(this.contentReader, recordHandler);

    // Bind handlers
    this.fileModifiedHandler = { handle: (e) => this.onFileModified(e) };
    this.fileDiscoveredHandler = { handle: (e) => this.onFileDiscovered(e) };
    this.fileExcludedHandler = { handle: (e) => this.onFileExcluded(e) };
    this.ignorePatternsChangedHandler = { handle: () => this.onIgnorePatternsChanged() };
    this.fileIndexRebuiltHandler = { handle: (e) => this.onFileIndexRebuilt(e) };
    this.changesDetectedHandler = { handle: (e) => this.onChangesDetected(e) };
  }

  register(): void {
    this.eventBus.register('FileModified', this.fileModifiedHandler);
    this.eventBus.register('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.register('FileExcluded', this.fileExcludedHandler);
    this.eventBus.register('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.register('FileIndexRebuilt', this.fileIndexRebuiltHandler);
    this.eventBus.register('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  unregister(): void {
    this.eventBus.unregister('FileModified', this.fileModifiedHandler);
    this.eventBus.unregister('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.unregister('FileExcluded', this.fileExcludedHandler);
    this.eventBus.unregister('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.unregister('FileIndexRebuilt', this.fileIndexRebuiltHandler);
    this.eventBus.unregister('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  private async onFileModified(event: FileModifiedEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

    // Tracking: detect changes and record hash using pre-instantiated handler
    await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
    
    // File index: ensure the file node exists
    await this.upsertFileNode(normalized);
  }

  private async onFileDiscovered(event: FileDiscoveredEvent): Promise<void> {
    if (event.isDirectory) return;
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

    // Tracking: record initial hash
    await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
    
    // File index: ensure the new file is added
    await this.upsertFileNode(normalized);
  }

  private async onFileExcluded(event: FileExcludedEvent): Promise<void> {
    await this.trackingRepo.deleteHashByPath(event.path);
  }

  private async onIgnorePatternsChanged(): Promise<void> {
    const allNodes = await this.fileSystemRepo.findAll();
    const currentFilePaths = new Set<string>();
    for (const node of allNodes) {
      if (node instanceof FileNode) currentFilePaths.add(node.path.value);
    }
    await this.trackingRepo.deleteAllExcept(currentFilePaths);
  }

  private async onFileIndexRebuilt(event: FileIndexRebuiltEvent): Promise<void> {
    await this.trackingRepo.deleteAllExcept(event.filePaths);
  }

  private async onChangesDetected(event: ChangesDetectedEvent): Promise<void> {
    const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(event.filePath.value);
    for (const docId of linkedDocs) {
      await this.eventBus.emit(new ReviewRequiredEvent(docId, event.filePath, 'OUTDATED'));
    }
  }

  private async upsertFileNode(normalizedPath: string): Promise<void> {
    try {
      const filePath = new FilePath(normalizedPath);
      const existing = await this.fileSystemRepo.findByPath(filePath);
      if (existing && existing instanceof FileNode) return;

      const id = new FileNodeId(UuidGenerator.generate());
      const name = filePath.getName();
      const parent = filePath.getParentPath();
      const node = new FileNode(
        id,
        filePath,
        name,
        parent,
        new FileSize(0),
        DateTime.now(),
        Maybe.none<FileHash>(),
        false
      );
      await this.fileSystemRepo.save(node);
    } catch (error) {
      console.error('[Saga] Failed to upsert file node:', normalizedPath, error);
    }
  }
}