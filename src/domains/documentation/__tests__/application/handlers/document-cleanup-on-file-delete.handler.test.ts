import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { IProjectConfigRepository } from '../../../../project/domain/repository/project-config-repository.interface';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';
import { WorkspaceId } from '../../../../project/domain/value-objects/workspace-id';
import { DocumentCleanupOnFileDelete } from '../../../application/handlers/document-cleanup-on-file-delete.handler';
import { FileDeletedEvent } from '../../../../filesystem/domain/events/file-deleted';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('DocumentCleanupOnFileDelete', () => {
  let handler: DocumentCleanupOnFileDelete;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;
  let mockConfigRepo: jest.Mocked<IProjectConfigRepository>;
  const workspaceId = new WorkspaceId('ws-1');

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

    mockConfigRepo = {
      findByWorkspaceId: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<IProjectConfigRepository>;

    handler = new DocumentCleanupOnFileDelete(mockDocumentRepo, mockConfigRepo, workspaceId);
  });

  const createMockConfig = (docsFolderPath: string | null): ProjectConfig => {
    return new ProjectConfig(
      workspaceId,
      {
        getOrNull: () => docsFolderPath,
        getOrElse: (v: string) => docsFolderPath ?? v,
        isSome: false,
        isNone: false,
        map: jest.fn(),
        flatMap: jest.fn(),
      } as any,
      [],
      '1.0'
    );
  };

  it('should do nothing if config has no docsFolderPath', async () => {
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(createMockConfig(null));
    const event = new FileDeletedEvent(new FileNodeId('fid'), new FilePath('some/file.md'));

    await handler.handle(event);

    expect(mockDocumentRepo.findByPath).not.toHaveBeenCalled();
  });

  it('should do nothing if deleted file is not within docs folder', async () => {
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(createMockConfig('docs'));
    const event = new FileDeletedEvent(new FileNodeId('fid'), new FilePath('src/main.ts'));

    await handler.handle(event);

    expect(mockDocumentRepo.findByPath).not.toHaveBeenCalled();
  });

  it('should do nothing if no document is found for the path', async () => {
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(createMockConfig('docs'));
    const event = new FileDeletedEvent(new FileNodeId('fid'), new FilePath('docs/readme.md'));
    mockDocumentRepo.findByPath.mockResolvedValue(null);

    await handler.handle(event);

    expect(mockDocumentRepo.delete).not.toHaveBeenCalled();
  });

  it('should delete the document if deleted file is within docs folder and document exists', async () => {
    mockConfigRepo.findByWorkspaceId.mockResolvedValue(createMockConfig('docs'));
    const doc = new Document(
      DocumentId.generate(),
      new DocumentPath('docs/readme.md'),
      'Readme',
      DateTime.now(),
      2
    );
    mockDocumentRepo.findByPath.mockResolvedValue(doc);
    const event = new FileDeletedEvent(new FileNodeId('fid'), new FilePath('docs/readme.md'));

    await handler.handle(event);

    expect(mockDocumentRepo.delete).toHaveBeenCalledWith(doc.id);
  });

  it('should silently ignore errors', async () => {
    mockConfigRepo.findByWorkspaceId.mockRejectedValue(new Error('boom'));
    const event = new FileDeletedEvent(new FileNodeId('fid'), new FilePath('something'));

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });
});