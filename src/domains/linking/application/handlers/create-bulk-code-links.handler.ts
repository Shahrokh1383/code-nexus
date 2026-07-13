import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { CodeToDocLink } from '../../domain/entities/code-to-doc-link';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { CreateBulkCodeLinksCommand } from '../commands/create-bulk-code-links.command';

export interface BulkCreateResult {
  createdCount: number;
  skippedCount: number;
}

export class CreateBulkCodeLinksHandler implements ICommandHandler<CreateBulkCodeLinksCommand, BulkCreateResult> {
  private readonly eventBus: EventBus;

  constructor(private readonly linkRepository: ILinkRepository) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: CreateBulkCodeLinksCommand): Promise<Result<BulkCreateResult, string>> {
    try {
      const documentId = new DocumentId(command.documentId);
      const codeFileIds = command.codeFileIds.map(id => new FileNodeId(id));
      let created = 0;
      let skipped = 0;

      for (const codeFileId of codeFileIds) {
        const existing = await this.linkRepository.findByCodeFileAndDocument(codeFileId, documentId);
        if (existing) {
          skipped++;
          continue;
        }

        const link = CodeToDocLink.create(codeFileId, documentId);
        await this.linkRepository.save(link);

        for (const event of link.getDomainEvents()) {
          await this.eventBus.emit(event);
        }
        link.clearDomainEvents();
        created++;
      }

      return Result.ok({ createdCount: created, skippedCount: skipped });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create bulk links';
      return Result.fail(message);
    }
  }
}