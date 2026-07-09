import { FileSystemJsonRepository } from '../../../infrastructure/repository/filesystem-json.repository';
import { FileNode } from '../../../domain/entities/file-node';
import { FolderNode } from '../../../domain/entities/folder-node';
import { FileNodeId } from '../../../domain/value-objects/file-node-id';
import { FolderNodeId } from '../../../domain/value-objects/folder-node-id';
import { FilePath } from '../../../domain/value-objects/file-path';
import { FileSize } from '../../../domain/value-objects/file-size';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';

class MockJsonDatabase extends JsonDatabase {
  private storage = new Map<string, unknown>();

  constructor() {
    super('/mock/workspace');
  }

  async read<T>(filename: string): Promise<T> {
    const data = this.storage.get(filename);
    if (!data) {
      throw new Error('File not found');
    }
    return data as T;
  }

  async write<T>(filename: string, data: T): Promise<void> {
    this.storage.set(filename, data);
  }

  async ensureDoclinkExists(): Promise<void> {}
}

describe('FileSystemJsonRepository', () => {
  let repo: FileSystemJsonRepository;
  let db: MockJsonDatabase;

  beforeEach(() => {
    db = new MockJsonDatabase();
    repo = new FileSystemJsonRepository(db);
  });

  const createFileNode = (id: string, path: string, size = 100): FileNode => {
    return new FileNode(
      new FileNodeId(id),
      new FilePath(path),
      path.split('/').pop() || '',
      new FilePath(path).getParentPath(),
      new FileSize(size),
      DateTime.now(),
      Maybe.none(),
      false
    );
  };

  const createFolderNode = (id: string, path: string): FolderNode => {
    return new FolderNode(
      new FolderNodeId(id),
      new FilePath(path),
      path.split('/').pop() || '.'
    );
  };

  it('should save and find a file node by id', async () => {
    const node = createFileNode('file-1', 'src/index.ts');
    await repo.save(node);

    const found = await repo.findById(node.id);
    expect(found).not.toBeNull();
    expect(found!.id.value).toBe('file-1');
    expect(found!.path.value).toBe('src/index.ts');
  });

  it('should save and find a folder node by path', async () => {
    const node = createFolderNode('folder-1', 'src');
    await repo.save(node);

    const found = await repo.findByPath(new FilePath('src'));
    expect(found).not.toBeNull();
    expect(found!.id.value).toBe('folder-1');
    expect((found as FolderNode).children).toHaveLength(0);
  });

  it('should return null for non-existent id', async () => {
    const found = await repo.findById(new FileNodeId('missing'));
    expect(found).toBeNull();
  });

  it('should return null for non-existent path', async () => {
    const found = await repo.findByPath(new FilePath('missing.ts'));
    expect(found).toBeNull();
  });

  it('should delete a node by id', async () => {
    const node = createFileNode('file-1', 'src/index.ts');
    await repo.save(node);
    await repo.delete(node.id);

    const found = await repo.findById(node.id);
    expect(found).toBeNull();
  });

  it('should find all nodes', async () => {
    await repo.save(createFileNode('file-1', 'readme.md'));
    await repo.save(createFolderNode('folder-1', 'src'));
    await repo.save(createFileNode('file-2', 'src/index.ts'));

    const all = await repo.findAll();
    expect(all).toHaveLength(3);
  });

  it('should find children of a folder', async () => {
    await repo.save(createFolderNode('root', '.'));
    await repo.save(createFolderNode('src-folder', 'src'));
    await repo.save(createFileNode('file-1', 'src/index.ts'));
    await repo.save(createFileNode('file-2', 'readme.md'));

    const children = await repo.findChildrenOf(new FilePath('src'));
    expect(children).toHaveLength(1);
    expect(children[0].path.value).toBe('src/index.ts');
  });

  it('should find root children', async () => {
    await repo.save(createFolderNode('root', '.'));
    await repo.save(createFileNode('file-1', 'readme.md'));
    await repo.save(createFolderNode('src-folder', 'src'));

    const children = await repo.findChildrenOf(new FilePath('.'));
    expect(children).toHaveLength(2);
  });

  it('should find files by pattern', async () => {
    await repo.save(createFileNode('file-1', 'src/index.ts'));
    await repo.save(createFileNode('file-2', 'src/App.tsx'));
    await repo.save(createFileNode('file-3', 'readme.md'));

    const results = await repo.findByPattern('.tsx');
    expect(results).toHaveLength(1);
    expect(results[0].path.value).toBe('src/App.tsx');
  });

  it('should check existence', async () => {
    const node = createFileNode('file-1', 'src/index.ts');
    await repo.save(node);

    expect(await repo.exists(node.id)).toBe(true);
    expect(await repo.exists(new FileNodeId('missing'))).toBe(false);
  });

  it('should persist hash for file nodes', async () => {
    const hash = 'a'.repeat(64);
    const node = new FileNode(
      new FileNodeId('file-1'),
      new FilePath('src/index.ts'),
      'index.ts',
      new FilePath('src'),
      new FileSize(100),
      DateTime.now(),
      Maybe.some(new FileHash(hash)),
      false
    );
    await repo.save(node);

    const found = await repo.findById(node.id) as FileNode;
    expect(found.hash.isSome).toBe(true);
    expect(found.hash.getOrNull()!.value).toBe(hash);
  });
});