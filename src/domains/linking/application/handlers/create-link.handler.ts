import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { CodeToDocLink } from '../../domain/entities/code-to-doc-link';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { CreateLinkCommand } from '../commands/create-link.command';

export class CreateLinkHandler implements ICommandHandler<CreateLinkCommand, void> {
  private readonly eventBus: EventBus;

  constructor(private readonly linkRepository: ILinkRepository) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: CreateLinkCommand): Promise<Result<void, string>> {
    try {
      const codeFileId = new FileNodeId(command.codeFileId);
      const documentId = new DocumentId(command.documentId);

      const existing = await this.linkRepository.findByCodeFileAndDocument(codeFileId, documentId);
      if (existing) {
        return Result.fail('Link already exists between this code file and document');
      }

      const link = CodeToDocLink.create(codeFileId, documentId);
      await this.linkRepository.save(link);

      for (const event of link.getDomainEvents()) {
        await this.eventBus.emit(event);
      }
      link.clearDomainEvents();

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create link';
      return Result.fail(message);
    }
  }
}