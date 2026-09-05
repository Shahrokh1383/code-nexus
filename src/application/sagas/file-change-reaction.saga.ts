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
import { LinkCreatedEvent } from '../../domains/linking/domain/events/link-created';
import { DetectChangesCommand } from '../../domains/tracking/application/commands/detect-changes.command';
import { DetectChangesHandler } from '../../domains/tracking/application/handlers/detect-changes.handler';
import { RecordHashHandler } from '../../domains/tracking/application/handlers/record-hash.handler';
import { IHashRepository } from '../../domains/tracking/domain/repository/hash-repository.interface';
import { IFileContentReader } from '../../domains/tracking/application/ports/file-content-reader.interface';
import { ILinkedDocumentQueryPort } from '../../domains/tracking/application/ports/linked-document-query.port';
import { IFileSystemRepository } from '../../domains/filesystem/domain/repository/filesystem-repository.interface';
import { IProjectConfigRepository } from '../../domains/project/domain/repository/project-config-repository.interface';
import { IBaselineDiffCacheRepository } from '../../domains/tracking/domain/repository/baseline-diff-cache-repository.interface';
import { DiffCalculatorService } from '../../domains/tracking/domain/services/diff-calculator.service';
import { FileNode } from '../../domains/filesystem/domain/entities/file-node';
import { FolderNode } from '../../domains/filesystem/domain/entities/folder-node';
import { FileNodeId } from '../../domains/filesystem/domain/value-objects/file-node-id';
import { FolderNodeId } from '../../domains/filesystem/domain/value-objects/folder-node-id';
import { FilePath } from '../../domains/filesystem/domain/value-objects/file-path';
import { FileHash } from '../../domains/filesystem/domain/value-objects/file-hash';
import { TrackedFilePath } from '../../domains/tracking/domain/value-objects/tracked-file-path';
import { IgnorePattern } from '../../domains/filesystem/domain/value-objects/ignore-pattern';
import { DateTime } from '../../domains/shared-kernel/types/date-time';
import { Maybe } from '../../domains/shared-kernel/types/maybe';
import { UuidGenerator } from '../../domains/shared-kernel/utils/uuid-generator';
import { WorkspaceId } from '../../domains/project/domain/value-objects/workspace-id';

export class FileChangeReactionSaga {
  private readonly eventBus: EventBus;
  private readonly linkedDocQuery: ILinkedDocumentQueryPort;
  private readonly fileSystemRepo: IFileSystemRepository;
  private readonly trackingRepo: IHashRepository;
  private readonly configRepo: IProjectConfigRepository;
  private readonly workspaceId: WorkspaceId;
  private readonly detectChangesHandler: DetectChangesHandler;

  private readonly fileModifiedHandler: IDomainEventHandler<FileModifiedEvent>;
  private readonly fileDiscoveredHandler: IDomainEventHandler<FileDiscoveredEvent>;
  private readonly fileDeletedHandler: IDomainEventHandler<FileDeletedEvent>;
  private readonly fileExcludedHandler: IDomainEventHandler<FileExcludedEvent>;
  private readonly ignorePatternsChangedHandler: IDomainEventHandler<IgnorePatternsChangedEvent>;
  private readonly fileIndexRebuiltHandler: IDomainEventHandler<FileIndexRebuiltEvent>;
  private readonly changesDetectedHandler: IDomainEventHandler<ChangesDetectedEvent>;
  private readonly linkCreatedHandler: IDomainEventHandler<LinkCreatedEvent>;

  constructor(
    linkedDocQuery: ILinkedDocumentQueryPort,
    fileSystemRepo: IFileSystemRepository,
    trackingRepo: IHashRepository,
    contentReader: IFileContentReader,
    diffService: DiffCalculatorService,
    configRepo: IProjectConfigRepository,
    workspaceId: WorkspaceId,
    cacheRepo: IBaselineDiffCacheRepository
  ) {
    this.eventBus = EventBus.getInstance();
    this.linkedDocQuery = linkedDocQuery;
    this.fileSystemRepo = fileSystemRepo;
    this.trackingRepo = trackingRepo;
    this.configRepo = configRepo;
    this.workspaceId = workspaceId;

    const recordHandler = new RecordHashHandler(this.trackingRepo, diffService, cacheRepo);
    this.detectChangesHandler = new DetectChangesHandler(contentReader, recordHandler, linkedDocQuery);

    this.fileModifiedHandler = { handle: (e) => this.onFileModified(e) };
    this.fileDiscoveredHandler = { handle: (e) => this.onFileDiscovered(e) };
    this.fileDeletedHandler = { handle: (e) => this.onFileDeleted(e) };
    this.fileExcludedHandler = { handle: (e) => this.onFileExcluded(e) };
    this.ignorePatternsChangedHandler = { handle: () => this.onIgnorePatternsChanged() };
    this.fileIndexRebuiltHandler = { handle: (e) => this.onFileIndexRebuilt(e) };
    this.changesDetectedHandler = { handle: (e) => this.onChangesDetected(e) };
    this.linkCreatedHandler = { handle: (e) => this.onLinkCreated(e) };
  }

  register(): void {
    this.eventBus.register('FileModified', this.fileModifiedHandler);
    this.eventBus.register('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.register('FileDeleted', this.fileDeletedHandler);
    this.eventBus.register('FileExcluded', this.fileExcludedHandler);
    this.eventBus.register('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.register('FileIndexRebuilt', this.fileIndexRebuiltHandler);
    this.eventBus.register('ChangesDetectedEvent', this.changesDetectedHandler);
    this.eventBus.register('LinkCreatedEvent', this.linkCreatedHandler);
  }

  unregister(): void {
    this.eventBus.unregister('FileModified', this.fileModifiedHandler);
    this.eventBus.unregister('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.unregister('FileDeleted', this.fileDeletedHandler);
    this.eventBus.unregister('FileExcluded', this.fileExcludedHandler);
    this.eventBus.unregister('IgnorePatternsChanged', this.ignorePatternsChangedHandler);
    this.eventBus.unregister('FileIndexRebuilt', this.fileIndexRebuiltHandler);
    this.eventBus.unregister('ChangesDetectedEvent', this.changesDetectedHandler);
    this.eventBus.unregister('LinkCreatedEvent', this.linkCreatedHandler);
  }

  private async isPathIgnored(filePath: string): Promise<boolean> {
    try {
      const config = await this.configRepo.findByWorkspaceId(this.workspaceId);
      if (!config) return false;
      return config.ignorePatterns.some(pattern => {
        try {
          return new IgnorePattern(pattern).matches(filePath);
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  }

  private async onFileModified(event: FileModifiedEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
    if (await this.isPathIgnored(normalized)) return;

    // Ensure file node exists BEFORE detection so that link lookup succeeds
    await this.upsertFileNode(normalized);

    await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
  }

  private async onFileDiscovered(event: FileDiscoveredEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
    if (await this.isPathIgnored(normalized)) return;

    if (event.isDirectory) {
      await this.upsertFolderNode(normalized);
    } else {
      // Ensure file node exists BEFORE detection
      await this.upsertFileNode(normalized);
      await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
    }
  }

  private async onFileDeleted(event: FileDeletedEvent): Promise<void> {
    const normalized = event.path.value.replace(/\\/g, '/');
    if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;

    try {
      await this.fileSystemRepo.deleteByPath(event.path);
      await this.trackingRepo.deleteHashByPath(new TrackedFilePath(event.path.value));
    } catch (error) {
      console.error('[Saga] Failed to delete file node:', normalized, error);
    }
  }

  private async onFileExcluded(event: FileExcludedEvent): Promise<void> {
    await this.trackingRepo.deleteHashByPath(new TrackedFilePath(event.path.value));
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

  private async onLinkCreated(event: LinkCreatedEvent): Promise<void> {
    if (event.category !== 'code') return;
    try {
      const filePath = await this.linkedDocQuery.findFilePathByFileId(event.sourceId);
      if (!filePath) return;
      const normalized = filePath.replace(/\\/g, '/');
      if (normalized.startsWith('.doclink/') || normalized === '.doclink') return;
      if (await this.isPathIgnored(normalized)) return;

      // Ensure file node exists BEFORE detection
      await this.upsertFileNode(normalized);

      await this.detectChangesHandler.execute(new DetectChangesCommand(normalized));
    } catch (error) {
      console.error('[Saga] Failed to process link created event:', error);
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