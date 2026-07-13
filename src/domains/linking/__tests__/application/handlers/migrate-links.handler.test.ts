import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { MigrateLinksCommand } from '../../../application/commands/migrate-links.command';
import { MigrateLinksHandler } from '../../../application/handlers/migrate-links.handler';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';
import { LinkMigrationService } from '../../../domain/services/link-migration.service';
import { LinksMigratedEvent } from '../../../domain/events/links-migrated';

describe('MigrateLinksHandler', () => {
  let handler: MigrateLinksHandler;
  let mockLinkRepo: jest.Mocked<ILinkRepository>;
  let mockMigrationService: jest.Mocked<LinkMigrationService>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockLinkRepo = {
      findByDocument: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;
    mockMigrationService = { migrate: jest.fn() } as any;
    
    handler = new MigrateLinksHandler(mockLinkRepo, mockMigrationService);
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  it('should orchestrate migration: save new links, delete old links, and emit event', async () => {
    const oldDocId = DocumentId.generate();
    const newDoc1 = DocumentId.generate();
    const newDoc2 = DocumentId.generate();
    
    const oldLink = CodeToDocLink.create(new FileNodeId('f1'), oldDocId);
    const newLink1 = CodeToDocLink.create(new FileNodeId('f1'), newDoc1);
    newLink1.markAsInherited();
    const newLink2 = CodeToDocLink.create(new FileNodeId('f1'), newDoc2);
    newLink2.markAsInherited();

    mockLinkRepo.findByDocument.mockResolvedValue([oldLink]);
    mockMigrationService.migrate.mockReturnValue({
      migratedLinks: [newLink1, newLink2],
      brokenLinkIds: [oldLink.id.value],
      event: new LinksMigratedEvent(oldDocId.value, [newDoc1.value, newDoc2.value], [newLink1.id.value, newLink2.id.value])
    });

    const command = new MigrateLinksCommand(oldDocId.value, [newDoc1.value, newDoc2.value]);
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(mockLinkRepo.save).toHaveBeenCalledTimes(2);
    expect(mockLinkRepo.delete).toHaveBeenCalledTimes(1);
  });

  it('should handle errors from repository or service gracefully', async () => {
    mockLinkRepo.findByDocument.mockRejectedValue(new Error('DB Error'));

    const command = new MigrateLinksCommand('old', ['new1']);
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toContain('DB Error');
  });
});