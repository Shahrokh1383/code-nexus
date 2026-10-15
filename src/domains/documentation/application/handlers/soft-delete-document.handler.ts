import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { DocumentId } from '../../domain/value-objects/document-id';
import { DocumentDeletedEvent } from '../../domain/events/document-deleted';
import { SoftDeleteDocumentCommand } from '../commands/soft-delete-document.command';

export class SoftDeleteDocumentHandler implements ICommandHandler<SoftDeleteDocumentCommand, void> {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(command: SoftDeleteDocumentCommand): Promise<Result<void, string>> {
    try {
      const doc = await this.documentRepo.findById(new DocumentId(command.documentId));
      if (!doc) return Result.fail('Document not found');

      doc.markAsDeleted();
      await this.documentRepo.softDelete(doc.id);

      await EventBus.getInstance().emit(new DocumentDeletedEvent(doc.id, doc.path));

      return Result.ok(void 0);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Soft delete failed');
    }
  }
}