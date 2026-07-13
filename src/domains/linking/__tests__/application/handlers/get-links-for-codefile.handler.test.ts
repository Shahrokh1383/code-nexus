import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { GetLinksForCodeFileQuery } from '../../../application/queries/get-links-for-codefile.query';
import { GetLinksForCodeFileHandler } from '../../../application/handlers/get-links-for-codefile.handler';
import { ILinkRepository } from '../../../domain/repository/link-repository.interface';
import { LinkId } from '../../../domain/value-objects/link-id';
import { LinkType } from '../../../domain/value-objects/link-type';

describe('GetLinksForCodeFileHandler', () => {
  let handler: GetLinksForCodeFileHandler;
  let mockRepo: jest.Mocked<ILinkRepository>;

  beforeEach(() => {
    mockRepo = {
      findByCodeFile: jest.fn(),
    } as any;
    handler = new GetLinksForCodeFileHandler(mockRepo);
  });

  it('should return mapped DTOs for a code file', async () => {
    const fileId = new FileNodeId('f1');
    const docId = DocumentId.generate();
    const migratedDate = DateTime.now();
    
    const link = CodeToDocLink.reconstitute(
      LinkId.generate(), fileId, docId, LinkType.inherited(), DateTime.now(), Maybe.some(migratedDate)
    );

    mockRepo.findByCodeFile.mockResolvedValue([link]);

    const query = new GetLinksForCodeFileQuery('f1');
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue();
    expect(dtos).toHaveLength(1);
    expect(dtos![0].codeFileId).toBe('f1');
    expect(dtos![0].type).toBe('INHERITED');
    expect(dtos![0].migratedAt).toBe(migratedDate.toISO());
  });
});