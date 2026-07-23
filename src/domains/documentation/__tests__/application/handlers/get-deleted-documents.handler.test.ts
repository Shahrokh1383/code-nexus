import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { GetDeletedDocumentsQuery } from '../../../application/queries/get-deleted-documents.query';
import { GetDeletedDocumentsHandler } from '../../../application/handlers/get-deleted-documents.handler';

describe('GetDeletedDocumentsHandler', () => {
  let handler: GetDeletedDocumentsHandler;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;

  beforeEach(() => {
    mockDocumentRepo = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findAll: jest.fn(),
      findAllNonDeleted: jest.fn(),
      findAllDeleted: jest.fn(),
      findOrphaned: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findByDocFolderPath: jest.fn(),
    } as unknown as jest.Mocked<IDocumentRepository>;

    handler = new GetDeletedDocumentsHandler(mockDocumentRepo);
  });

  const createDeletedDoc = (id: string, title: string): Document => {
    return new Document(
      new DocumentId(id),
      new DocumentPath(`docs/${title.toLowerCase()}.md`),
      title,
      DateTime.now(),
      0,
      true  // deleted flag
    );
  };

  it('should return deleted documents as DTOs', async () => {
    const docs = [
      createDeletedDoc('doc-1', 'Readme'),
      createDeletedDoc('doc-2', 'Guide'),
    ];
    mockDocumentRepo.findAllDeleted.mockResolvedValue(docs);

    const result = await handler.execute(new GetDeletedDocumentsQuery('ws-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue();
    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('doc-1');
    expect(dtos[1].title).toBe('Guide');
  });

  it('should return empty array when no deleted documents', async () => {
    mockDocumentRepo.findAllDeleted.mockResolvedValue([]);

    const result = await handler.execute(new GetDeletedDocumentsQuery('ws-1'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });

  it('should map fields correctly', async () => {
    const doc = createDeletedDoc('doc-1', 'Readme');
    mockDocumentRepo.findAllDeleted.mockResolvedValue([doc]);

    const result = await handler.execute(new GetDeletedDocumentsQuery('ws-1'));
    const dto = result.getValue()![0];
    expect(dto.path).toBe('docs/readme.md');
    expect(dto.linkCount).toBe(0);
    expect(dto.isOrphaned).toBe(true); // linkCount 0 -> orphaned
  });
});