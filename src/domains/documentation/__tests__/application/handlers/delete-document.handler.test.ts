import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { SoftDeleteDocumentCommand } from '../../../application/commands/soft-delete-document.command';
import { SoftDeleteDocumentHandler } from '../../../application/handlers/soft-delete-document.handler';
import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('SoftDeleteDocumentHandler', () => {
  let handler: SoftDeleteDocumentHandler;
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

    handler = new SoftDeleteDocumentHandler(mockDocumentRepo);
  });

  const createDoc = () => new Document(
    new DocumentId('doc-1'),
    new DocumentPath('docs/readme.md'),
    'Readme',
    DateTime.now(),
    1
  );

  it('should fail if document not found', async () => {
    mockDocumentRepo.findById.mockResolvedValue(null);

    const result = await handler.execute(new SoftDeleteDocumentCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Document not found');
  });

  it('should mark document as deleted and call repository softDelete', async () => {
    const doc = createDoc();
    mockDocumentRepo.findById.mockResolvedValue(doc);

    const result = await handler.execute(new SoftDeleteDocumentCommand('doc-1'));

    expect(result.isSuccess).toBe(true);
    expect(doc.deleted).toBe(true);
    expect(mockDocumentRepo.softDelete).toHaveBeenCalledWith(doc.id);
  });

  it('should return failure on repository error', async () => {
    const doc = createDoc();
    mockDocumentRepo.findById.mockResolvedValue(doc);
    mockDocumentRepo.softDelete.mockRejectedValue(new Error('db error'));

    const result = await handler.execute(new SoftDeleteDocumentCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('db error');
  });
});