import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { DocumentId } from '../../domain/value-objects/document-id';
import { DocumentDeletedEvent } from '../../domain/events/document-deleted';
import { IFileDeletionPort } from '../ports/file-deletion-port.interface';
import { PermanentDeleteDocumentCommand } from '../commands/permanent-delete-document.command';

export class PermanentDeleteDocumentHandler implements ICommandHandler<PermanentDeleteDocumentCommand, void> {
  private readonly eventBus = EventBus.getInstance();

  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly fileDeletionPort: IFileDeletionPort
  ) {}

  async execute(command: PermanentDeleteDocumentCommand): Promise<Result<void, string>> {
    try {
      const doc = await this.documentRepo.findById(new DocumentId(command.documentId));
      if (!doc) return Result.fail('Document not found');

      await this.fileDeletionPort.deleteFile(doc.path.value);
      await this.documentRepo.delete(doc.id);

      await this.eventBus.emit(new DocumentDeletedEvent(doc.id, doc.path));
      return Result.ok(void 0);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Permanent delete failed');
    }
  }
}