import { Document } from '../../../domain/entities/document';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { IDocumentRepository } from '../../../domain/repository/document-repository.interface';
import { IDocFolderRepository } from '../../../domain/repository/doc-folder-repository.interface';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { GetAllDocumentsQuery } from '../../../application/queries/get-all-documents.query';
import { GetAllDocumentsHandler } from '../../../application/handlers/get-all-documents.handler';
import { ProjectConfig } from '../../../../project/domain/entities/project-config';

function createMockConfig(docsFolderPathValue: string | null): jest.Mocked<ProjectConfig> {
  return {
    docsFolderPath: {
      getOrNull: jest.fn().mockReturnValue(docsFolderPathValue),
    },
  } as unknown as jest.Mocked<ProjectConfig>;
}

describe('GetAllDocumentsHandler', () => {
  let handler: GetAllDocumentsHandler;
  let mockDocumentRepo: jest.Mocked<IDocumentRepository>;
  let mockDocFolderRepo: jest.Mocked<IDocFolderRepository>;
  let mockConfigRepo: jest.Mocked<IProjectConfigRepository>;

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

    mockDocFolderRepo = {
      findByPath: jest.fn(),
    } as unknown as jest.Mocked<IDocFolderRepository>;

    mockConfigRepo = {
      findByWorkspaceId: jest.fn(),
    } as unknown as jest.Mocked<IProjectConfigRepository>;

    mockConfigRepo.findByWorkspaceId.mockResolvedValue(
      createMockConfig(null)
    );

    handler = new GetAllDocumentsHandler(
      mockDocumentRepo,
      mockDocFolderRepo,
      mockConfigRepo
    );
  });

  const createDocument = (id: string, title: string, isOrphaned: boolean): Document => {
    return new Document(
      new DocumentId(id),
      new DocumentPath(`docs/${title.toLowerCase()}.md`),
      title,
      DateTime.fromISO('2024-01-01T00:00:00.000Z'),
      isOrphaned ? 0 : 2
    );
  };

  it('should return all documents as DTOs', async () => {
    const docs = [
      createDocument('doc-1', 'Readme', false),
      createDocument('doc-2', 'Guide', true),
    ];
    mockDocumentRepo.findAll.mockResolvedValue(docs);

    const result = await handler.execute(new GetAllDocumentsQuery('workspace-123'));

    expect(result.isSuccess).toBe(true);
    const response = result.getValue();
    expect(response).toBeDefined();
    const dtos = response!.documents;
    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('doc-1');
    expect(dtos[0].title).toBe('Readme');
    expect(dtos[0].isOrphaned).toBe(false);
    expect(dtos[1].id).toBe('doc-2');
    expect(dtos[1].isOrphaned).toBe(true);
    expect(response!.docFolder).toBeNull(); // because config returned null docsFolderPath
  });

  it('should return empty array when no documents exist', async () => {
    mockDocumentRepo.findAll.mockResolvedValue([]);

    const result = await handler.execute(new GetAllDocumentsQuery('workspace-123'));

    expect(result.isSuccess).toBe(true);
    const response = result.getValue();
    expect(response).toBeDefined();
    expect(response!.documents).toEqual([]);
    expect(response!.docFolder).toBeNull();
  });

  it('should map document properties correctly', async () => {
    const doc = createDocument('doc-1', 'Readme', false);
    mockDocumentRepo.findAll.mockResolvedValue([doc]);

    const result = await handler.execute(new GetAllDocumentsQuery('workspace-123'));
    expect(result.isSuccess).toBe(true);
    const response = result.getValue();
    const dtos = response!.documents;

    expect(dtos[0].path).toBe('docs/readme.md');
    expect(dtos[0].lastModified).toBe('2024-01-01T00:00:00.000Z');
    expect(dtos[0].linkCount).toBe(2);
  });
});