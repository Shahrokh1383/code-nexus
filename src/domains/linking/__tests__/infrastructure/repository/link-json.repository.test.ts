import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { LinkJsonRepository } from '../../../infrastructure/repository/link-json.repository';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../../../domain/entities/code-to-doc-link';
import { LinkId } from '../../../domain/value-objects/link-id';

describe('LinkJsonRepository', () => {
  let repo: LinkJsonRepository;
  let mockDb: jest.Mocked<JsonDatabase>;

  beforeEach(() => {
    mockDb = {
      read: jest.fn(),
      write: jest.fn(),
    } as any;
    
    repo = new LinkJsonRepository('dummy-root');
    (repo as any).db = mockDb;
  });

  it('should save a new code-to-doc link to the JSON file', async () => {
    mockDb.read.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockDb.write.mockResolvedValue(undefined);

    const link = CodeToDocLink.create(new FileNodeId('f1'), DocumentId.generate());
    await repo.save(link);

    expect(mockDb.write).toHaveBeenCalledWith('links.json', expect.objectContaining({
      version: '1.0',
      links: expect.arrayContaining([
        expect.objectContaining({ id: link.id.value, codeFileId: 'f1' })
      ])
    }));
  });

  it('should update an existing link when saving with the same ID', async () => {
    const link = CodeToDocLink.create(new FileNodeId('f1'), DocumentId.generate());
    const existingData = {
      version: '1.0',
      links: [{
        id: link.id.value,
        codeFileId: 'f1',
        documentId: link.documentId.value,
        type: 'DIRECT',
        createdAt: link.createdAt.toISO(),
        migratedAt: null
      }]
    };

    mockDb.read.mockResolvedValue(existingData);
    mockDb.write.mockResolvedValue(undefined);

    link.markAsInherited(); // Change state
    await repo.save(link);

    expect(mockDb.write).toHaveBeenCalledWith('links.json', expect.objectContaining({
      links: expect.arrayContaining([
        expect.objectContaining({ id: link.id.value, type: 'INHERITED' })
      ])
    }));
  });

  it('should delete a link by ID', async () => {
    const linkId = LinkId.generate();
    const existingData = {
      version: '1.0',
      links: [
        { id: linkId.value, codeFileId: 'f1', documentId: 'd1', type: 'DIRECT', createdAt: '', migratedAt: null },
        { id: 'other-id', codeFileId: 'f2', documentId: 'd2', type: 'DIRECT', createdAt: '', migratedAt: null }
      ]
    };

    mockDb.read.mockResolvedValue(existingData);
    mockDb.write.mockResolvedValue(undefined);

    await repo.delete(linkId);

    expect(mockDb.write).toHaveBeenCalledWith('links.json', expect.objectContaining({
      links: expect.not.arrayContaining([
        expect.objectContaining({ id: linkId.value })
      ])
    }));
  });

  it('should return empty array when file does not exist (ENOENT)', async () => {
    mockDb.read.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    
    const links = await repo.findAll();
    expect(links).toHaveLength(0);
  });
});