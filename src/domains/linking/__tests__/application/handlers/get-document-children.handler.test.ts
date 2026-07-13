import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { GetDocumentChildrenQuery } from '../../../application/queries/get-document-children.query';
import { GetDocumentChildrenHandler } from '../../../application/handlers/get-document-children.handler';
import { IDocumentLinkRepository } from '../../../domain/repository/document-link-repository.interface';

describe('GetDocumentChildrenHandler', () => {
  let handler: GetDocumentChildrenHandler;
  let mockRepo: jest.Mocked<IDocumentLinkRepository>;

  beforeEach(() => {
    mockRepo = { findChildrenOf: jest.fn() } as any;
    handler = new GetDocumentChildrenHandler(mockRepo);
  });

  it('should return an array of child document IDs', async () => {
    const parentId = DocumentId.generate();
    const child1 = DocumentId.generate();
    const child2 = DocumentId.generate();

    mockRepo.findChildrenOf.mockResolvedValue([child1, child2]);

    const query = new GetDocumentChildrenQuery(parentId.value);
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const children = result.getValue();
    expect(children).toHaveLength(2);
    expect(children).toContain(child1.value);
    expect(children).toContain(child2.value);
  });

  it('should return an empty array if no children exist', async () => {
    const parentId = DocumentId.generate();
    mockRepo.findChildrenOf.mockResolvedValue([]);

    const result = await handler.execute(new GetDocumentChildrenQuery(parentId.value));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toHaveLength(0);
  });
});