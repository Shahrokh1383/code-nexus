import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { GetDocumentChildrenQuery } from '../../../application/queries/get-document-children.query';
import { GetDocumentChildrenHandler } from '../../../application/handlers/get-document-children.handler';
import { IDocumentLinkRepository } from '../../../domain/repository/document-link-repository.interface';
import { DocumentLinkDto } from '../../../application/dto/document-link.dto';

describe('GetDocumentChildrenHandler', () => {
  let handler: GetDocumentChildrenHandler;
  let mockRepo: jest.Mocked<IDocumentLinkRepository>;

  beforeEach(() => {
    // Mock the exact method the handler uses: findByParentDocument
    mockRepo = {
      findByParentDocument: jest.fn(),
    } as any;
    
    handler = new GetDocumentChildrenHandler(mockRepo);
  });

  it('should return an array of DocumentLinkDto when children exist', async () => {
    const parentId = DocumentId.generate();
    const childId1 = DocumentId.generate();
    const childId2 = DocumentId.generate();
    const linkId1 = 'link-1';
    const linkId2 = 'link-2';
    const nowIso = new Date().toISOString();

    // Mocking the Domain Entities returned by the repository
    // We only mock the exact shape the handler's .map() function accesses
    const mockLinks = [
      {
        id: { value: linkId1 },
        parentDocumentId: { value: parentId.value },
        childDocumentId: { value: childId1.value },
        type: { value: 'EXPLICIT' },
        createdAt: { toISO: () => nowIso }
      },
      {
        id: { value: linkId2 },
        parentDocumentId: { value: parentId.value },
        childDocumentId: { value: childId2.value },
        type: { value: 'IMPLICIT' },
        createdAt: { toISO: () => nowIso }
      }
    ];

    mockRepo.findByParentDocument.mockResolvedValue(mockLinks as any);

    const query = new GetDocumentChildrenQuery(parentId.value);
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue() as DocumentLinkDto[];
    
    expect(dtos).toHaveLength(2);
    
    // Verify the exact DTO mapping
    expect(dtos[0]).toEqual({
      id: linkId1,
      parentDocumentId: parentId.value,
      childDocumentId: childId1.value,
      type: 'EXPLICIT',
      createdAt: nowIso
    });

    expect(dtos[1].childDocumentId).toBe(childId2.value);
  });

  it('should return an empty array if no children exist', async () => {
    const parentId = DocumentId.generate();
    mockRepo.findByParentDocument.mockResolvedValue([]);

    const result = await handler.execute(new GetDocumentChildrenQuery(parentId.value));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toHaveLength(0);
  });
});