import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { GetLinksForDocumentQuery } from '../../../application/queries/get-links-for-document.query';
import { GetLinksForDocumentHandler } from '../../../application/handlers/get-links-for-document.handler';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';
import { LinkId } from '../../../domain/value-objects/link-id';
import { LinkType } from '../../../domain/value-objects/link-type';

describe('GetLinksForDocumentHandler', () => {
  let handler: GetLinksForDocumentHandler;
  let mockRepo: jest.Mocked<ILinkRepository>;

  beforeEach(() => {
    mockRepo = {
      findByDocument: jest.fn(),
    } as any;
    handler = new GetLinksForDocumentHandler(mockRepo);
  });

  it('should return mapped DTOs for a document', async () => {
    const docId = DocumentId.generate();
    const fileId = new FileNodeId('f1');
    const link = CodeToDocLink.reconstitute(
      LinkId.generate(), fileId, docId, LinkType.direct(), DateTime.now(), Maybe.none<DateTime>()
    );

    mockRepo.findByDocument.mockResolvedValue([link]);

    const query = new GetLinksForDocumentQuery(docId.value);
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue();
    expect(dtos).toHaveLength(1);
    expect(dtos![0].documentId).toBe(docId.value);
    expect(dtos![0].codeFileId).toBe('f1');
    expect(dtos![0].type).toBe('DIRECT');
    expect(dtos![0].migratedAt).toBeNull();
  });

  it('should return empty array if no links exist', async () => {
    const docId = DocumentId.generate();
    mockRepo.findByDocument.mockResolvedValue([]);

    const query = new GetLinksForDocumentQuery(docId.value);
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toHaveLength(0);
  });
});