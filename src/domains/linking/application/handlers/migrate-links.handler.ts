import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { LinkMigrationService } from '../../domain/services/link-migration.service';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { MigrateLinksCommand } from '../commands/migrate-links.command';
import { LinkId } from '../../domain/value-objects/link-id';

export class MigrateLinksHandler implements ICommandHandler<MigrateLinksCommand, void> {
  private readonly eventBus: EventBus;

  constructor(
    private readonly linkRepository: ILinkRepository,
    private readonly migrationService: LinkMigrationService
  ) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: MigrateLinksCommand): Promise<Result<void, string>> {
    try {
      const oldDocId = new DocumentId(command.oldDocumentId);
      const newDocIds = command.newDocumentIds.map(id => new DocumentId(id));

      const existingLinks = await this.linkRepository.findByDocument(oldDocId);
      const result = this.migrationService.migrate(oldDocId, newDocIds, existingLinks);

      for (const newLink of result.migratedLinks) {
        await this.linkRepository.save(newLink);
      }

      for (const brokenId of result.brokenLinkIds) {
        await this.linkRepository.delete(new LinkId(brokenId));
      }

      if (result.event) {
        await this.eventBus.emit(result.event);
      }

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to migrate links';
      return Result.fail(message);
    }
  }
}