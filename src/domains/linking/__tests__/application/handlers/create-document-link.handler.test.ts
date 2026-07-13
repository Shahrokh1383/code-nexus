import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { IDocumentRepository } from '../../../../documentation/domain/repository/document-repository.interface';
import { CreateDocumentLinkCommand } from '../../../application/commands/create-document-link.command';
import { CreateDocumentLinkHandler } from '../../../application/handlers/create-document-link.handler';
import { IDocumentLinkRepository } from '../../../domain/repository/document-link-repository.interface';
import { DocumentLinkValidatorService } from '../../../domain/services/document-link-validator.service';

describe('CreateDocumentLinkHandler', () => {
  let handler: CreateDocumentLinkHandler;
  let mockDocLinkRepo: jest.Mocked<IDocumentLinkRepository>;
  let mockDocRepo: jest.Mocked<IDocumentRepository>;
  let mockValidator: jest.Mocked<DocumentLinkValidatorService>;
  let eventBus: EventBus;

  beforeEach(() => {
    mockDocLinkRepo = { findByParentAndChild: jest.fn(), save: jest.fn() } as any;
    mockDocRepo = { findById: jest.fn() } as any;
    mockValidator = { validateNoCycles: jest.fn() } as any;
    
    handler = new CreateDocumentLinkHandler(mockDocLinkRepo, mockDocRepo, mockValidator);
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  it('should create a document link if validation passes', async () => {
    const parentId = DocumentId.generate().value;
    const childId = DocumentId.generate().value;
    const command = new CreateDocumentLinkCommand(parentId, childId);

    mockDocRepo.findById.mockResolvedValue({} as any); // Simulate docs exist
    mockDocLinkRepo.findByParentAndChild.mockResolvedValue(null);
    mockValidator.validateNoCycles.mockResolvedValue(undefined);
    mockDocLinkRepo.save.mockResolvedValue(undefined);

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(true);
    expect(mockValidator.validateNoCycles).toHaveBeenCalled();
    expect(mockDocLinkRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should fail if parent document does not exist', async () => {
    const command = new CreateDocumentLinkCommand('non-existent', DocumentId.generate().value);
    mockDocRepo.findById.mockResolvedValue(null);

    const result = await handler.execute(command);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toContain('Document');
  });
});