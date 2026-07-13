import { DateTime } from '../../../../shared-kernel/types/date-time';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DocumentToDocumentLink } from '../../../domain/entities/document-to-document-link';
import { GetDocumentParentsQuery } from '../../../application/queries/get-document-parents.query';
import { GetDocumentParentsHandler } from '../../../application/handlers/get-document-parents.handler';
import { IDocumentLinkRepository } from '../../../domain/repository/document-link-repository.interface';
import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';
import { LinkType } from '../../../domain/value-objects/link-type';

describe('GetDocumentParentsHandler', () => {
  let handler: GetDocumentParentsHandler;
  let mockRepo: jest.Mocked<IDocumentLinkRepository>;

  beforeEach(() => {
    mockRepo = { findByChildDocument: jest.fn() } as any;
    handler = new GetDocumentParentsHandler(mockRepo);
  });

  it('should return mapped DocumentLinkDto array for parents', async () => {
    const childId = DocumentId.generate();
    const parentId = DocumentId.generate();
    const link = DocumentToDocumentLink.reconstitute(
      DocumentLinkId.generate(), parentId, childId, LinkType.direct(), DateTime.now()
    );

    mockRepo.findByChildDocument.mockResolvedValue([link]);

    const result = await handler.execute(new GetDocumentParentsQuery(childId.value));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue();
    expect(dtos).toHaveLength(1);
    expect(dtos![0].childDocumentId).toBe(childId.value);
    expect(dtos![0].parentDocumentId).toBe(parentId.value);
    expect(dtos![0].type).toBe('DIRECT');
  });
});