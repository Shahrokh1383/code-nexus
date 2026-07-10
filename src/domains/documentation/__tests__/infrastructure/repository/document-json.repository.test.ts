import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { DocumentId } from '../../../domain/value-objects/document-id';
import { DocumentPath } from '../../../domain/value-objects/document-path';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Document } from '../../../domain/entities/document';
import { DocumentJsonRepository } from '../../../infrastructure/repository/document-json.repository';

describe('DocumentJsonRepository', () => {
  let mockDb: jest.Mocked<JsonDatabase>;
  let repository: DocumentJsonRepository;

  beforeEach(() => {
    mockDb = {
      read: jest.fn(),
      write: jest.fn(),
      ensureDoclinkExists: jest.fn(),
      readTextFile: jest.fn(),
      writeTextFile: jest.fn(),
    } as unknown as jest.Mocked<JsonDatabase>;

    repository = new DocumentJsonRepository(mockDb);
  });

  const createDocument = (id: string = 'doc-1'): Document => {
    return new Document(
      new DocumentId(id),
      new DocumentPath('docs/readme.md'),
      'Readme',
      DateTime.fromISO('2024-01-01T00:00:00.000Z'),
      0
    );
  };

  it('should find document by id', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: 'docs',
      documents: [
        {
          id: 'doc-1',
          path: 'docs/readme.md',
          title: 'Readme',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
      ],
    });

    const result = await repository.findById(new DocumentId('doc-1'));

    expect(result).not.toBeNull();
    expect(result?.id.value).toBe('doc-1');
    expect(result?.title).toBe('Readme');
  });

  it('should return null when document not found', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: null,
      documents: [],
    });

    const result = await repository.findById(new DocumentId('missing'));

    expect(result).toBeNull();
  });

  it('should save new document and preserve docsFolderPath', async () => {
    mockDb.read.mockRejectedValue(new Error('File not found'));

    const document = createDocument();

    await repository.save(document);

    expect(mockDb.write).toHaveBeenCalledWith(
      'documents.json',
      expect.objectContaining({
        version: '1.0',
        docsFolderPath: null,
        documents: [
          expect.objectContaining({
            id: 'doc-1',
            path: 'docs/readme.md',
            title: 'Readme',
            linkCount: 0,
            isOrphaned: true,
          }),
        ],
      })
    );
  });

  it('should update existing document', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: 'docs',
      documents: [
        {
          id: 'doc-1',
          path: 'docs/readme.md',
          title: 'Old Title',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
      ],
    });

    const document = createDocument();
    document.updateTitle('New Title');

    await repository.save(document);

    const savedData = mockDb.write.mock.calls[0][1] as {
      documents: Array<{ title: string }>;
      docsFolderPath: string | null;
    };
    expect(savedData.documents[0].title).toBe('New Title');
    expect(savedData.documents).toHaveLength(1);
    expect(savedData.docsFolderPath).toBe('docs');
  });

  it('should delete document by id', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: null,
      documents: [
        {
          id: 'doc-1',
          path: 'docs/a.md',
          title: 'A',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
        {
          id: 'doc-2',
          path: 'docs/b.md',
          title: 'B',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
      ],
    });

    await repository.delete(new DocumentId('doc-1'));

    const savedData = mockDb.write.mock.calls[0][1] as {
      documents: Array<{ id: string }>;
    };
    expect(savedData.documents).toHaveLength(1);
    expect(savedData.documents[0].id).toBe('doc-2');
  });

  it('should find all documents', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: 'docs',
      documents: [
        {
          id: 'doc-1',
          path: 'docs/a.md',
          title: 'A',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
        {
          id: 'doc-2',
          path: 'docs/b.md',
          title: 'B',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 2,
          isOrphaned: false,
        },
      ],
    });

    const result = await repository.findAll();

    expect(result).toHaveLength(2);
  });

  it('should find orphaned documents only', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: null,
      documents: [
        {
          id: 'doc-1',
          path: 'docs/a.md',
          title: 'A',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
        {
          id: 'doc-2',
          path: 'docs/b.md',
          title: 'B',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 2,
          isOrphaned: false,
        },
      ],
    });

    const result = await repository.findOrphaned();

    expect(result).toHaveLength(1);
    expect(result[0].id.value).toBe('doc-1');
  });

    it('should find documents by doc folder path', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: 'docs',
      documents: [
        {
          id: 'doc-1',
          path: 'docs/readme.md',
          title: 'Readme',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
        {
          id: 'doc-2',
          path: 'src/main.ts',
          title: 'Main',
          lastModified: '2024-01-01T00:00:00.000Z',
          linkCount: 0,
          isOrphaned: true,
        },
      ],
    });

    const result = await repository.findByDocFolderPath('docs');

    expect(result).toHaveLength(1);
    expect(result[0].path.value).toBe('docs/readme.md');
  });

  it('should update docsFolderPath', async () => {
    mockDb.read.mockResolvedValue({
      version: '1.0',
      docsFolderPath: null,
      documents: [],
    });

    await repository.updateDocsFolderPath('documentation');

    const savedData = mockDb.write.mock.calls[0][1] as {
      docsFolderPath: string | null;
    };
    expect(savedData.docsFolderPath).toBe('documentation');
  });

  it('should default docsFolderPath to null when file does not exist', async () => {
    mockDb.read.mockRejectedValue(new Error('File not found'));

    const result = await repository.findAll();

    expect(result).toEqual([]);
    expect(mockDb.read).toHaveBeenCalledWith('documents.json');
  });
});