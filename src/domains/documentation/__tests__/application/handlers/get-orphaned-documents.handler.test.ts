import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { GetOrphanedDocumentsQuery } from '../../../application/queries/get-orphaned-documents.query';
import { GetOrphanedDocumentsHandler } from '../../../application/handlers/get-orphaned-documents.handler';

describe('GetOrphanedDocumentsHandler', () => {
  let handler: GetOrphanedDocumentsHandler;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;

  beforeEach(() => {
    mockDocumentRepo = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findAll: jest.fn(),
      findOrphaned: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByDocFolderPath: jest.fn(),
    } as unknown as jest.Mocked<IDocumentRepository>;

    handler = new GetOrphanedDocumentsHandler(mockDocumentRepo);
  });

  const createDocument = (id: string, title: string, isOrphaned: boolean): Document => {
    return new Document(
      new DocumentId(id),
      new DocumentPath(`docs/${title.toLowerCase()}.md`),
      title,
      DateTime.now(),
      isOrphaned ? 0 : 2
    );
  };

    it('should return only orphaned documents', async () => {
    const orphaned = createDocument('doc-1', 'Orphan', true);
    mockDocumentRepo.findOrphaned.mockResolvedValue([orphaned]);

    const result = await handler.execute(new GetOrphanedDocumentsQuery());

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue() ?? [];
    expect(dtos).toHaveLength(1);
    expect(dtos[0].id).toBe('doc-1');
    expect(dtos[0].isOrphaned).toBe(true);
  });

  it('should return empty array when no orphaned documents', async () => {
    mockDocumentRepo.findOrphaned.mockResolvedValue([]);

    const result = await handler.execute(new GetOrphanedDocumentsQuery());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });
});