import { EventBus } from '../../domains/shared-kernel/events/event-bus';
import { IDomainEventHandler } from '../../domains/shared-kernel/events/domain-event-handler.interface';
import { FileModifiedEvent } from '../../domains/filesystem/domain/events/file-modified';
import { FileDiscoveredEvent } from '../../domains/filesystem/domain/events/file-discovered';
import { ChangesDetectedEvent } from '../../domains/tracking/domain/events/changes-detected';
import { ReviewRequiredEvent } from '../../domains/tracking/domain/events/review-required';
import { DetectChangesCommand } from '../../domains/tracking/application/commands/detect-changes.command';
import { DetectChangesHandler } from '../../domains/tracking/application/handlers/detect-changes.handler';
import { TrackingJsonRepository } from '../../domains/tracking/infrastructure/repository/tracking-json.repository';
import { FileContentReaderAdapter } from '../../domains/tracking/infrastructure/adapters/file-content-reader.adapter';
import { ILinkedDocumentQueryPort } from '../../domains/tracking/application/ports/linked-document-query.port';
import { DiffCalculatorAdapter } from '../../domains/tracking/infrastructure/adapters/diff-calculator.adapter';
import { DiffCalculatorService } from '../../domains/tracking/domain/services/diff-calculator.service';

export class FileChangeReactionSaga {
  private readonly eventBus: EventBus;
  private readonly workspaceRoot: string;
  private readonly linkedDocQuery: ILinkedDocumentQueryPort;

  // Store handler references for later unregistration
  private readonly fileModifiedHandler: IDomainEventHandler<FileModifiedEvent>;
  private readonly fileDiscoveredHandler: IDomainEventHandler<FileDiscoveredEvent>;
  private readonly changesDetectedHandler: IDomainEventHandler<ChangesDetectedEvent>;

  constructor(workspaceRoot: string, linkedDocQuery: ILinkedDocumentQueryPort) {
    this.eventBus = EventBus.getInstance();
    this.workspaceRoot = workspaceRoot;
    this.linkedDocQuery = linkedDocQuery;

    // Create handlers bound to this instance
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

    this.changesDetectedHandler = {
      handle: async (event: ChangesDetectedEvent): Promise<void> => {
        await this.onChangesDetected(event);
      },
    };
  }

  register(): void {
    this.eventBus.register('FileModified', this.fileModifiedHandler);
    this.eventBus.register('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.register('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  unregister(): void {
    this.eventBus.unregister('FileModified', this.fileModifiedHandler);
    this.eventBus.unregister('FileDiscovered', this.fileDiscoveredHandler);
    this.eventBus.unregister('ChangesDetectedEvent', this.changesDetectedHandler);
  }

  private async onFileChanged(filePath: string): Promise<void> {
    if (filePath.startsWith('.doclink') || filePath === '.doclink') {
      return;
    }

    const repository = new TrackingJsonRepository(this.workspaceRoot);
    const contentReader = new FileContentReaderAdapter(this.workspaceRoot);
    const diffAdapter = new DiffCalculatorAdapter();
    const diffService = new DiffCalculatorService(diffAdapter);

    const handler = new DetectChangesHandler(contentReader, repository, diffService);
    await handler.execute(new DetectChangesCommand(filePath));
  }

  private async onChangesDetected(event: ChangesDetectedEvent): Promise<void> {
    const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(event.filePath.value);
    for (const docId of linkedDocs) {
      await this.eventBus.emit(new ReviewRequiredEvent(docId, event.filePath, 'OUTDATED'));
    }
  }
}