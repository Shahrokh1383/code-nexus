import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DocumentToDocumentLink } from '../../../domain/entities/document-to-document-link';
import { RemoveDocumentLinkCommand } from '../../../application/commands/remove-document-link.command';
import { RemoveDocumentLinkHandler } from '../../../application/handlers/remove-document-link.handler';
import { IDocumentLinkRepository } from '../../../domain/repository/document-link-repository.interface';

describe('RemoveDocumentLinkHandler', () => {
  let handler: RemoveDocumentLinkHandler;
  let mockRepo: jest.Mocked<IDocumentLinkRepository>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    handler = new RemoveDocumentLinkHandler(mockRepo);
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  it('should remove an existing document link and delete via repository', async () => {
    const parent = DocumentId.generate();
    const child = DocumentId.generate();
    const link = DocumentToDocumentLink.create(parent, child);
    link.clearDomainEvents(); 
    
    mockRepo.findById.mockResolvedValue(link);
    mockRepo.delete.mockResolvedValue();

    const command = new RemoveDocumentLinkCommand(link.id.value);
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith(link.id);
  });

  it('should return failure if document link is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const command = new RemoveDocumentLinkCommand('non-existent-id');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toContain('DocumentToDocumentLink');
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});