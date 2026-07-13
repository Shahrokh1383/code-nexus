import { DateTime } from '../../../../shared-kernel/types/date-time';
import { InvalidStateException } from '../../../../shared-kernel/exceptions/invalid-state-exception';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DocumentToDocumentLink } from '../../../domain/entities/document-to-document-link';
import { IDocumentLinkRepository } from '../../../domain/repository/document-link-repository.interface';
import { DocumentLinkValidatorService } from '../../../domain/services/document-link-validator.service';
import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';
import { LinkType } from '../../../domain/value-objects/link-type';

describe('DocumentLinkValidatorService', () => {
  let service: DocumentLinkValidatorService;
  let mockRepo: jest.Mocked<IDocumentLinkRepository>;

  beforeEach(() => {
    mockRepo = {
      findByParentDocument: jest.fn(),
    } as any;
    service = new DocumentLinkValidatorService(mockRepo);
  });

  it('should throw InvalidStateException if linking a document to itself', async () => {
    const docId = DocumentId.generate();
    await expect(service.validateNoCycles(docId, docId)).rejects.toThrow(InvalidStateException);
  });

  it('should pass validation if there are no cycles', async () => {
    const parent = DocumentId.generate();
    const child = DocumentId.generate();
    
    mockRepo.findByParentDocument.mockResolvedValue([]);
    await expect(service.validateNoCycles(parent, child)).resolves.not.toThrow();
  });

  it('should detect and throw on circular links', async () => {
    const A = DocumentId.generate();
    const B = DocumentId.generate();
    const C = DocumentId.generate();

    // A -> B -> C -> A (Cycle)
    mockRepo.findByParentDocument.mockImplementation(async (id: DocumentId) => {
      if (id.equals(B)) return [DocumentToDocumentLink.reconstitute(DocumentLinkId.generate(), B, C, LinkType.direct(), DateTime.now())];
      if (id.equals(C)) return [DocumentToDocumentLink.reconstitute(DocumentLinkId.generate(), C, A, LinkType.direct(), DateTime.now())];
      return [];
    });

    await expect(service.validateNoCycles(A, B)).rejects.toThrow(InvalidStateException);
  });
});