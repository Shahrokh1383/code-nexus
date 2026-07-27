import { EventBus } from '../../domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../domains/shared-kernel/events/domain-event-handler.interface';
import { FileModifiedEvent } from '../../domains/filesystem/domain/events/file-modified';
import { FileDiscoveredEvent } from '../../domains/filesystem/domain/events/file-discovered';
import { FileDeletedEvent } from '../../domains/filesystem/domain/events/file-deleted';
import { FileExcludedEvent } from '../../domains/filesystem/domain/events/file-excluded';
import { IgnorePatternsChangedEvent } from '../../domains/filesystem/domain/events/ignore-patterns-changed';
import { FileIndexRebuiltEvent } from '../../domains/filesystem/domain/events/file-index-rebuilt';
import { ChangesDetectedEvent } from '../../domains/tracking/domain/events/changes-detected';
import { ReviewRequiredEvent } from '../../domains/tracking/domain/events/review-required';
import { DetectChangesCommand } from '../../domains/tracking/application/commands/detect-changes.command';
import { DetectChangesHandler } from '../../domains/tracking/application/handlers/detect-changes.handler';
import { RecordHashHandler } from '../../domains/tracking/application/handlers/record-hash.handler';
import { IHashRepository } from '../../domains/tracking/domain/repository/hash-repository.interface';
import { IFileContentReader } from '../../domains/tracking/application/ports/file-content-reader.interface';
import { ILinkedDocumentQueryPort } from '../../domains/tracking/application/ports/linked-document-query.port';
import { IFileSystemRepository } from '../../domains/filesystem/domain/repository/filesystem-repository.interface';
import { DiffCalculatorService } from '../../domains/tracking/domain/services/diff-calculator.service';
import { FileNode } from '../../domains/filesystem/domain/entities/file-node';
import { FolderNode } from '../../domains/filesystem/domain/entities/folder-node';
import { FileNodeId } from '../../domains/filesystem/domain/value-objects/file-node-id';
import { FolderNodeId } from '../../domains/filesystem/domain/value-objects/folder-node-id';
import { FilePath } from '../../domains/filesystem/domain/value-objects/file-path';
import { FileHash } from '../../domains/filesystem/domain/value-objects/file-hash';
import { DateTime } from '../../domains/shared-kernel/types/date-time';
import { Maybe } from '../../domains/shared-kernel/types/maybe';
import { UuidGenerator } from '../../domains/shared-kernel/utils/uuid-generator';

export class FileChangeReactionSaga {
  private readonly eventBus: EventBus;
  private readonly linkedDocQuery: ILinkedDocumentQueryPort;
  private readonly fileSystemRepo: IFileSystemRepository;
  private readonly trackingRepo: IHashRepository;
  private readonly detectChangesHandler: DetectChangesHandler;

  private readonly fileModifiedHandler: IDomainEventHandler<FileModifiedEvent>;
  private readonly fileDiscoveredHandler: IDomainEventHandler<FileDiscoveredEvent>;
  private readonly fileDeletedHandler: IDomainEventHandler<FileDeletedEvent>;
  private readonly fileExcludedHandler: IDomainEventHandler<FileExcludedEvent>;
  private readonly ignorePatternsChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent>;
  private readonly fileIndexRebuiltHandler: IDomainEventHandler<FileIndexRebuiltEvent>;
  private readonly changesDetectedHandler: IDomainEventHandler<ChangesDetectedEvent>;

  constructor(
    linkedDocQuery: ILinkedDocumentQueryPort,
    fileSystemRepo: IFileSystemRepository,
    trackingRepo: IHashRepository,
    contentReader: IFileContentReader,
    diffService: DiffCalculatorService
  ) {
    this.eventBus = EventBus.getInstance();
    this.linkedDocQuery = linkedDocQuery;
    this.fileSystemRepo = fileSystemRepo;
    this.trackingRepo = trackingRepo;

    const recordHandler = new RecordHashHandler(this.trackingRepo, diffService, contentReader);
    this.detectChangesHandler = new DetectChangesHandler(contentReader, recordHandler);

    this.fileModifiedHandler = { handle: (e) => this.onFileModified(e) };
    this.fileDiscoveredHandler = { handle: (e) => this.onFileDiscovered(e) };
    this.fileDeletedHandler = { handle: (e) => this.onFileDeleted(e) };
    this.fileExcludedHandler = { handle: (e) => this.onFileExcluded(e) };
    this.ignorePatternsChangedHandler = { handle: () => this.onIgnorePatternsChanged() };
    this.fileIndexRebuiltHandler = { handle: (e) => this.onFileIndexRebuilt(e) };
    this.changesDetectedHandler = { handle: (e) => this.onChangesDetected(e) };
  }

  register(): void {
    this.eventBus.register('FileModified', this.fileModifiedHandler);
    this.eventBus.register('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.register('FileDeleted', this.fileDeletedHandler);
    this.eventBus.register('FileExcluded', this.fileExcludedHandler);
    this.eventBus.register('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.register('FileIndexRebuilt', this.fileIndexRebuiltHandler);
    this.eventBus.register('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  unregister(): void {
    this.eventBus.unregister('FileModified', this.fileModifiedHandler);
    this.eventBus.unregister('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.unregister('FileDeleted', this.fileDeletedHandler);
    this.eventBus.unregister('FileExcluded', this.fileExcludedHandler);
    this.eventBus.unregister('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.unregister('FileIndexRebuilt', this.fileIndexRebuiltHandler);
    this.eventBus.unregister('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  private async onFileModified(event: FileModifiedEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

    await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
    await this.upsertFileNode(normalized);
  }

  private async onFileDiscovered(event: FileDiscoveredEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

    if (event.isDirectory) {
      await this.upsertFolderNode(normalized);
    } else {
      await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
      await this.upsertFileNode(normalized);
    }
  }

  private async onFileDeleted(event: FileDeletedEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

    try {
      await this.fileSystemRepo.deleteByPath(event.path);
      await this.trackingRepo.deleteHashByPath(event.path);
    } catch (error) {
      console.error('[Saga] Failed to delete file node:', normalized, error);
    }
  }

  private async onFileExcluded(event: FileExcludedEvent): Promise<void> {
    await this.trackingRepo.deleteHashByPath(event.path);
  }

  private async onIgnorePatternsChanged(): Promise<void> {
    const currentFilePaths = await this.fileSystemRepo.getAllFilePaths();
    const currentFilePathsSet = new Set<string>(currentFilePaths);
    await this.trackingRepo.deleteAllExcept(currentFilePathsSet);
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
        DateTime.now(),
        Maybe.none<FileHash>(),
        false
      );
      await this.fileSystemRepo.save(node);
    } catch (error) {
      console.error('[Saga] Failed to upsert file node:', normalizedPath, error);
    }
  }

  private async upsertFolderNode(normalizedPath: string): Promise<void> {
    try {
      const filePath = new FilePath(normalizedPath);
      const existing = await this.fileSystemRepo.findByPath(filePath);
      if (existing && existing instanceof FolderNode) return;

      const id = new FolderNodeId(UuidGenerator.generate());
      const name = filePath.getName() || '.';
      const node = new FolderNode(id, filePath, name);
      await this.fileSystemRepo.save(node);
    } catch (error) {
      console.error('[Saga] Failed to upsert folder node:', normalizedPath, error);
    }
  }
}