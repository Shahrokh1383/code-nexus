import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { DocumentDeletedEvent } from '../../../domain/events/document-deleted';
import { DeleteDocumentCommand } from '../../../application/commands/delete-document.command';
import { DeleteDocumentHandler } from '../../../application/handlers/delete-document.handler';
import { IFileDeletionPort } from '../../../application/ports/file-deletion-port.interface';

describe('DeleteDocumentHandler', () => {
  let eventBus: EventBus;
  let handler: DeleteDocumentHandler;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;
  let mockFileDeletionPort: jest.Mocked<IFileDeletionPort>;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.clear();

    mockDocumentRepo = {
      findById: jest.fn(),
      findByPath: jest.fn(),
      findAll: jest.fn(),
      findOrphaned: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByDocFolderPath: jest.fn(),
    } as unknown as jest.Mocked<IDocumentRepository>;

    mockFileDeletionPort = {
      deleteFile: jest.fn(),
    } as unknown as jest.Mocked<IFileDeletionPort>;

    handler = new DeleteDocumentHandler(mockDocumentRepo, mockFileDeletionPort);
  });

  afterEach(() => {
    eventBus.clear();
  });

  const createDocument = (id: string = 'doc-123'): Document => {
    return new Document(
      new DocumentId(id),
      new DocumentPath('docs/readme.md'),
      'Readme',
      DateTime.now(),
      0
    );
  };

  it('should delete document and emit event', async () => {
    const document = createDocument();
    mockDocumentRepo.findById.mockResolvedValue(document);

    const eventSpy = jest.fn();
    eventBus.register('DocumentDeletedEvent', {
      handle: async (event) => eventSpy(event),
    });

    const result = await handler.execute(new DeleteDocumentCommand('doc-123'));

    expect(result.isSuccess).toBe(true);
    expect(mockFileDeletionPort.deleteFile).toHaveBeenCalledWith('docs/readme.md');
    expect(mockDocumentRepo.delete).toHaveBeenCalledWith(document.id);
    expect(eventSpy).toHaveBeenCalledTimes(1);
    const emittedEvent = eventSpy.mock.calls[0][0] as DocumentDeletedEvent;
    expect(emittedEvent.documentId.value).toBe('doc-123');
    expect(emittedEvent.path.value).toBe('docs/readme.md');
  });

  it('should fail when document is not found', async () => {
    mockDocumentRepo.findById.mockResolvedValue(null);

    const result = await handler.execute(new DeleteDocumentCommand('missing-id'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBe('Document not found');
    expect(mockFileDeletionPort.deleteFile).not.toHaveBeenCalled();
  });

  it('should fail when file deletion fails', async () => {
    const document = createDocument();
    mockDocumentRepo.findById.mockResolvedValue(document);
    mockFileDeletionPort.deleteFile.mockRejectedValue(new Error('Permission denied'));

    const result = await handler.execute(new DeleteDocumentCommand('doc-123'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Permission denied');
    expect(mockDocumentRepo.delete).not.toHaveBeenCalled();
  });
});