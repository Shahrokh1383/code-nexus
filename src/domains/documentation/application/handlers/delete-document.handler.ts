import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { DocumentId } from '../../domain/value-objects/document-id';
import { DocumentDeletedEvent } from '../../domain/events/document-deleted';
import { DeleteDocumentCommand } from '../commands/delete-document.command';
import { IFileDeletionPort } from '../ports/file-deletion-port.interface';

export class DeleteDocumentHandler implements ICommandHandler<DeleteDocumentCommand, void> {
  private readonly eventBus: EventBus;

  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly fileDeletionPort: IFileDeletionPort
  ) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: DeleteDocumentCommand): Promise<Result<void, string>> {
    try {
      const document = await this.documentRepo.findById(
        new DocumentId(command.documentId)
      );

      if (!document) {
        return Result.fail('Document not found');
      }

      await this.fileDeletionPort.deleteFile(document.path.value);
      await this.documentRepo.delete(document.id);

      await this.eventBus.emit(
        new DocumentDeletedEvent(document.id, document.path)
      );

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';
      return Result.fail(message);
    }
  }
}