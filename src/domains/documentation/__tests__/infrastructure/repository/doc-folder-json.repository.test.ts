import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { DocFolderId } from '../../../domain/value-objects/doc-folder-id';
import { DocFolderSignature } from '../../../domain/value-objects/doc-folder-signature';
import { DocFolder } from '../../../domain/entities/doc-folder';
import { DocFolderJsonRepository } from '../../../infrastructure/repository/doc-folder-json.repository';

describe('DocFolderJsonRepository', () => {
  let mockDb: jest.Mocked<JsonDatabase>;
  let repository: DocFolderJsonRepository;

  beforeEach(() => {
    mockDb = {
      read: jest.fn(),
      write: jest.fn(),
      ensureDoclinkExists: jest.fn(),
      readTextFile: jest.fn(),
      writeTextFile: jest.fn(),
    } as unknown as jest.Mocked<JsonDatabase>;

    repository = new DocFolderJsonRepository(mockDb);
  });

  const createDocFolder = (path: string = 'docs'): DocFolder => {
    return new DocFolder(
      DocFolderId.generate(),
      path,
      new DocFolderSignature(2, ['readme.md', 'guide.md'], 1),
      2
    );
  };

  it('should find doc folder from config.json', async () => {
    mockDb.read.mockResolvedValue({
      workspaceId: 'workspace-123',
      docsFolderPath: 'docs',
      ignorePatterns: [],
      schemaVersion: '1.0',
      docFolder: {
        id: 'folder-1',
        path: 'docs',
        signature: {
          fileCount: 2,
          topLevelFileNames: ['readme.md', 'guide.md'],
          directoryDepth: 1,
        },
        documentCount: 2,
      },
    });

    const result = await repository.findByWorkspaceId('workspace-123');

    expect(result).not.toBeNull();
    expect(result?.path).toBe('docs');
    expect(result?.signature.fileCount).toBe(2);
  });

  it('should return null when no docFolder section exists', async () => {
    mockDb.read.mockResolvedValue({
      workspaceId: 'workspace-123',
      docsFolderPath: null,
      ignorePatterns: [],
      schemaVersion: '1.0',
      docFolder: null,
    });

    const result = await repository.findByWorkspaceId('workspace-123');

    expect(result).toBeNull();
  });

  it('should return null when config.json does not exist', async () => {
    mockDb.read.mockRejectedValue(new Error('File not found'));

    const result = await repository.findByWorkspaceId('workspace-123');

    expect(result).toBeNull();
  });

  it('should save docFolder into config.json preserving other fields', async () => {
    mockDb.read.mockResolvedValue({
      workspaceId: 'workspace-123',
      docsFolderPath: 'old-docs',
      ignorePatterns: ['node_modules/'],
      schemaVersion: '1.0',
      docFolder: null,
    });

    const docFolder = createDocFolder('documentation');

    await repository.save(docFolder);

    expect(mockDb.write).toHaveBeenCalledWith(
      'config.json',
      expect.objectContaining({
        workspaceId: 'workspace-123',
        docsFolderPath: 'old-docs',
        ignorePatterns: ['node_modules/'],
        schemaVersion: '1.0',
        docFolder: expect.objectContaining({
          path: 'documentation',
          signature: expect.objectContaining({
            fileCount: 2,
            topLevelFileNames: ['readme.md', 'guide.md'],
            directoryDepth: 1,
          }),
          documentCount: 2,
        }),
      })
    );
  });

  it('should throw when saving docFolder but config.json does not exist', async () => {
    mockDb.read.mockRejectedValue(new Error('File not found'));

    const docFolder = createDocFolder();

    await expect(repository.save(docFolder)).rejects.toThrow(
      'config.json does not exist'
    );
  });

  it('should delete docFolder by setting it to null in config.json', async () => {
    mockDb.read.mockResolvedValue({
      workspaceId: 'workspace-123',
      docsFolderPath: 'docs',
      ignorePatterns: [],
      schemaVersion: '1.0',
      docFolder: {
        id: 'folder-1',
        path: 'docs',
        signature: { fileCount: 1, topLevelFileNames: ['readme.md'], directoryDepth: 1 },
        documentCount: 1,
      },
    });

    await repository.delete(new DocFolderId('folder-1'));

    const savedData = mockDb.write.mock.calls[0][1] as { docFolder: null };
    expect(savedData.docFolder).toBeNull();
  });

  it('should handle delete when config.json does not exist', async () => {
    mockDb.read.mockRejectedValue(new Error('File not found'));

    await repository.delete(new DocFolderId('folder-1'));

    expect(mockDb.write).not.toHaveBeenCalled();
  });
});