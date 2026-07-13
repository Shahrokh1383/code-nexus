import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { DocumentLinkJsonRepository } from '../../../infrastructure/repository/document-link-json.repository';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DocumentToDocumentLink } from '../../../domain/entities/document-to-document-link';
import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';

describe('DocumentLinkJsonRepository', () => {
  let repo: DocumentLinkJsonRepository;
  let mockDb: jest.Mocked<JsonDatabase>;

  beforeEach(() => {
    mockDb = {
      read: jest.fn(),
      write: jest.fn(),
    } as any;
    
    repo = new DocumentLinkJsonRepository('dummy-root');
    (repo as any).db = mockDb;
  });

  it('should save a document-to-document link', async () => {
    mockDb.read.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockDb.write.mockResolvedValue(undefined);

    const parent = DocumentId.generate();
    const child = DocumentId.generate();
    const link = DocumentToDocumentLink.create(parent, child);
    
    await repo.save(link);

    expect(mockDb.write).toHaveBeenCalledWith('document-links.json', expect.objectContaining({
      version: '1.0',
      links: expect.arrayContaining([
        expect.objectContaining({ 
          id: link.id.value, 
          parentDocumentId: parent.value,
          childDocumentId: child.value
        })
      ])
    }));
  });

  it('should find children of a parent document', async () => {
    const parentId = DocumentId.generate();
    const child1 = DocumentId.generate();
    const child2 = DocumentId.generate();

    mockDb.read.mockResolvedValue({
      version: '1.0',
      links: [
        { id: 'l1', parentDocumentId: parentId.value, childDocumentId: child1.value, type: 'DIRECT', createdAt: '' },
        { id: 'l2', parentDocumentId: parentId.value, childDocumentId: child2.value, type: 'DIRECT', createdAt: '' },
        { id: 'l3', parentDocumentId: 'other', childDocumentId: 'other-child', type: 'DIRECT', createdAt: '' }
      ]
    });

    const children = await repo.findChildrenOf(parentId);
    
    expect(children).toHaveLength(2);
    expect(children.map(c => c.value)).toContain(child1.value);
    expect(children.map(c => c.value)).toContain(child2.value);
  });

  it('should find link by parent and child IDs', async () => {
    const parentId = DocumentId.generate();
    const childId = DocumentId.generate();

    mockDb.read.mockResolvedValue({
      version: '1.0',
      links: [
        { id: 'l1', parentDocumentId: parentId.value, childDocumentId: childId.value, type: 'DIRECT', createdAt: '' }
      ]
    });

    const link = await repo.findByParentAndChild(parentId, childId);
    expect(link).not.toBeNull();
    expect(link!.parentDocumentId.equals(parentId)).toBe(true);
  });

  it('should return null if no link exists between parent and child', async () => {
    mockDb.read.mockResolvedValue({ version: '1.0', links: [] });

    const link = await repo.findByParentAndChild(DocumentId.generate(), DocumentId.generate());
    expect(link).toBeNull();
  });

  it('should delete a document link by ID', async () => {
    const linkId = DocumentLinkId.generate();
    mockDb.read.mockResolvedValue({
      version: '1.0',
      links: [
        { id: linkId.value, parentDocumentId: 'p1', childDocumentId: 'c1', type: 'DIRECT', createdAt: '' }
      ]
    });
    mockDb.write.mockResolvedValue(undefined);

    await repo.delete(linkId);

    expect(mockDb.write).toHaveBeenCalledWith('document-links.json', expect.objectContaining({
      links: []
    }));
  });
});