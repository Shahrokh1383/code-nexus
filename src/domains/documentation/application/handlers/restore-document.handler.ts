import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { DocumentId } from '../../domain/value-objects/document-id';
import { RestoreDocumentCommand } from '../commands/restore-document.command';

export class RestoreDocumentHandler implements ICommandHandler<RestoreDocumentCommand, void> {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(command: RestoreDocumentCommand): Promise<Result<void, string>> {
    try {
      const doc = await this.documentRepo.findById(new DocumentId(command.documentId));
      if (!doc) return Result.fail('Document not found');

      doc.markAsRestored();
      await this.documentRepo.restore(doc.id);
      return Result.ok(void 0);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Restore failed');
    }
  }
}