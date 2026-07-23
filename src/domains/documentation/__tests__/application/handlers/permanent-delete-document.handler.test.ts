import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { IFileDeletionPort } from '../../../application/ports/file-deletion-port.interface';
import { PermanentDeleteDocumentCommand } from '../../../application/commands/permanent-delete-document.command';
import { PermanentDeleteDocumentHandler } from '../../../application/handlers/permanent-delete-document.handler';
import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('PermanentDeleteDocumentHandler', () => {
  let eventBus: EventBus;
  let handler: PermanentDeleteDocumentHandler;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;
  let mockFileDeletionPort: jest.Mocked<IFileDeletionPort>;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.clear();

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

    mockFileDeletionPort = {
      deleteFile: jest.fn(),
    } as jest.Mocked<IFileDeletionPort>;

    handler = new PermanentDeleteDocumentHandler(mockDocumentRepo, mockFileDeletionPort);
  });

  afterEach(() => {
    eventBus.clear();
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

    const result = await handler.execute(new PermanentDeleteDocumentCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Document not found');
  });

  it('should delete physical file and repository record, and emit event', async () => {
    const doc = createDoc();
    mockDocumentRepo.findById.mockResolvedValue(doc);
    const eventSpy = jest.fn();
    eventBus.register('DocumentDeletedEvent', { handle: async (e) => eventSpy(e) });

    const result = await handler.execute(new PermanentDeleteDocumentCommand('doc-1'));

    expect(result.isSuccess).toBe(true);
    expect(mockFileDeletionPort.deleteFile).toHaveBeenCalledWith(doc.path.value);
    expect(mockDocumentRepo.delete).toHaveBeenCalledWith(doc.id);
    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy.mock.calls[0][0].documentId).toEqual(doc.id);
  });

  it('should return failure on file deletion error', async () => {
    const doc = createDoc();
    mockDocumentRepo.findById.mockResolvedValue(doc);
    mockFileDeletionPort.deleteFile.mockRejectedValue(new Error('permission denied'));

    const result = await handler.execute(new PermanentDeleteDocumentCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('permission denied');
  });
});