import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { RemoveLinkCommand } from '../../../application/commands/remove-link.command';
import { RemoveLinkHandler } from '../../../application/handlers/remove-link.handler';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';

describe('RemoveLinkHandler', () => {
  let handler: RemoveLinkHandler;
  let mockRepo: jest.Mocked<ILinkRepository>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    handler = new RemoveLinkHandler(mockRepo);
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  it('should remove an existing link and delete via repository', async () => {
    const link = CodeToDocLink.create(new FileNodeId('f1'), DocumentId.generate());
    link.clearDomainEvents(); 
    
    mockRepo.findById.mockResolvedValue(link);
    mockRepo.delete.mockResolvedValue();

    const command = new RemoveLinkCommand(link.id.value);
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.delete).toHaveBeenCalledWith(link.id);
  });

  it('should return failure if link is not found', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const command = new RemoveLinkCommand('non-existent-id');
    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toContain('CodeToDocLink');
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});