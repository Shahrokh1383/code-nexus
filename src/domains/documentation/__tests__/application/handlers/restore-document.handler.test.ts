import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { RestoreDocumentCommand } from '../../../application/commands/restore-document.command';
import { RestoreDocumentHandler } from '../../../application/handlers/restore-document.handler';
import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('RestoreDocumentHandler', () => {
  let handler: RestoreDocumentHandler;
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

    handler = new RestoreDocumentHandler(mockDocumentRepo);
  });

  const createDeletedDoc = () => {
    const doc = new Document(
      new DocumentId('doc-1'),
      new DocumentPath('docs/readme.md'),
      'Readme',
      DateTime.now(),
      1,
      true // deleted
    );
    return doc;
  };

  it('should fail if document not found', async () => {
    mockDocumentRepo.findById.mockResolvedValue(null);

    const result = await handler.execute(new RestoreDocumentCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Document not found');
  });

  it('should restore the document and call repository restore', async () => {
    const doc = createDeletedDoc();
    mockDocumentRepo.findById.mockResolvedValue(doc);

    const result = await handler.execute(new RestoreDocumentCommand('doc-1'));

    expect(result.isSuccess).toBe(true);
    expect(doc.deleted).toBe(false); // markAsRestored called
    expect(mockDocumentRepo.restore).toHaveBeenCalledWith(doc.id);
  });

  it('should return failure on repository error', async () => {
    const doc = createDeletedDoc();
    mockDocumentRepo.findById.mockResolvedValue(doc);
    mockDocumentRepo.restore.mockRejectedValue(new Error('db error'));

    const result = await handler.execute(new RestoreDocumentCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('db error');
  });
});