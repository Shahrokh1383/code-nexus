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

  constructor(workspaceRoot: string, linkedDocQuery: ILinkedDocumentQueryPort) {
    this.eventBus = EventBus.getInstance();
    this.workspaceRoot = workspaceRoot;
    this.linkedDocQuery = linkedDocQuery;
  }

  register(): void {
    this.eventBus.register('FileModified', {
      handle: async (event: FileModifiedEvent): Promise<void> => {
        await this.onFileChanged(event.path.value);
      },
    } as IDomainEventHandler<FileModifiedEvent>);

    this.eventBus.register('FileDiscovered', {
      handle: async (event: FileDiscoveredEvent): Promise<void> => {
        if (!event.isDirectory) {
          await this.onFileChanged(event.path.value);
        }
      },
    } as IDomainEventHandler<FileDiscoveredEvent>);

    this.eventBus.register('ChangesDetectedEvent', {
      handle: async (event: ChangesDetectedEvent): Promise<void> => {
        await this.onChangesDetected(event);
      },
    } as IDomainEventHandler<ChangesDetectedEvent>);
  }

  private async onFileChanged(filePath: string): Promise<void> {
    const repository = new TrackingJsonRepository(this.workspaceRoot);
    const contentReader = new FileContentReaderAdapter(this.workspaceRoot);
    const diffAdapter = new DiffCalculatorAdapter();
    const diffService = new DiffCalculatorService(diffAdapter); // Wired correctly

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