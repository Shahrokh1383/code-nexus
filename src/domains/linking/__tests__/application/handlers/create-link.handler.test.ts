import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CreateLinkCommand } from '../../../application/commands/create-link.command';
import { CreateLinkHandler } from '../../../application/handlers/create-link.handler';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';

describe('CreateLinkHandler', () => {
  let handler: CreateLinkHandler;
  let mockRepo: jest.Mocked<ILinkRepository>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockRepo = {
      findByCodeFileAndDocument: jest.fn(),
      save: jest.fn(),
    } as any;
    
    handler = new CreateLinkHandler(mockRepo);
    eventBus = EventBus.getInstance();
    eventBus.clear(); 
  });

  it('should create a link and save it via repository', async () => {
    const codeFileId = new FileNodeId('file-1').value;
    const documentId = DocumentId.generate().value;
    const command = new CreateLinkCommand(codeFileId, documentId);

    mockRepo.findByCodeFileAndDocument.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should fail if link already exists', async () => {
    const codeFileId = new FileNodeId('file-1').value;
    const documentId = DocumentId.generate().value;
    const command = new CreateLinkCommand(codeFileId, documentId);

    mockRepo.findByCodeFileAndDocument.mockResolvedValue({} as any); 

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe('Link already exists between this code file and document');
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});