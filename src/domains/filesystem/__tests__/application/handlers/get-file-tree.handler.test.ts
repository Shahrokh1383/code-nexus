import { GetFileTreeHandler } from '../../../../application/handlers/get-file-tree.handler';
import { GetFileTreeQuery } from '../../../../application/queries/get-file-tree.query';
import { IFileSystemRepository } from '../../../../domain/repository/filesystem-repository.interface';
import { FileNode } from '../../../../domain/entities/file-node';
import { FolderNode } from '../../../../domain/entities/folder-node';
import { FileNodeId } from '../../../../domain/value-objects/file-node-id';
import { FolderNodeId } from '../../../../domain/value-objects/folder-node-id';
import { FilePath } from '../../../../domain/value-objects/file-path';
import { FileSize } from '../../../../domain/value-objects/file-size';
import { DateTime } from '../../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../../shared-kernel/types/maybe';
import { Identifier } from '../../../../../shared-kernel/types/identifier';

class MockFileSystemRepository implements IFileSystemRepository {
  private nodes = new Map<string, FileNode | FolderNode>();

  async findById(id: Identifier): Promise<FileNode | FolderNode | null> {
    return this.nodes.get(id.value) ?? null;
  }

  async findByPath(path: FilePath): Promise<FileNode | FolderNode | null> {
    for (const node of this.nodes.values()) {
      if (node.path.equals(path)) return node;
    }
    return null;
  }

  async save(node: FileNode | FolderNode): Promise<void> {
    this.nodes.set(node.id.value, node);
  }

  async delete(id: Identifier): Promise<void> {
    this.nodes.delete(id.value);
  }

  async exists(id: Identifier): Promise<boolean> {
    return this.nodes.has(id.value);
  }

  async findAll(): Promise<Array<FileNode | FolderNode>> {
    return Array.from(this.nodes.values());
  }

  async findChildrenOf(parentPath: FilePath): Promise<Array<FileNode | FolderNode>> {
    const children: Array<FileNode | FolderNode> = [];
    for (const node of this.nodes.values()) {
      if (node instanceof FileNode) {
        if (node.parentPath.equals(parentPath)) children.push(node);
      } else {
        if (node.path.getParentPath().equals(parentPath)) children.push(node);
      }
    }
    return children;
  }

  async findByPattern(pattern: string): Promise<FileNode[]> {
    const result: FileNode[] = [];
    for (const node of this.nodes.values()) {
      if (node instanceof FileNode && node.path.value.includes(pattern)) {
        result.push(node);
      }
    }
    return result;
  }

  seedTree(): void {
    const root = new FolderNode(new FolderNodeId('root'), new FilePath('.'), '.');
    const src = new FolderNode(new FolderNodeId('src'), new FilePath('src'), 'src');
    const components = new FolderNode(new FolderNodeId('components'), new FilePath('src/components'), 'components');
    const button = new FileNode(
      new FileNodeId('button'),
      new FilePath('src/components/Button.tsx'),
      'Button.tsx',
      new FilePath('src/components'),
      new FileSize(200),
      DateTime.now(),
      Maybe.none(),
      false
    );
    const app = new FileNode(
      new FileNodeId('app'),
      new FilePath('src/App.tsx'),
      'App.tsx',
      new FilePath('src'),
      new FileSize(300),
      DateTime.now(),
      Maybe.none(),
      false
    );
    const readme = new FileNode(
      new FileNodeId('readme'),
      new FilePath('readme.md'),
      'readme.md',
      new FilePath('.'),
      new FileSize(100),
      DateTime.now(),
      Maybe.none(),
      false
    );

    components.addChild(button);
    src.addChild(components);
    src.addChild(app);
    root.addChild(src);
    root.addChild(readme);

    this.nodes.set(root.id.value, root);
    this.nodes.set(src.id.value, src);
    this.nodes.set(components.id.value, components);
    this.nodes.set(button.id.value, button);
    this.nodes.set(app.id.value, app);
    this.nodes.set(readme.id.value, readme);
  }
}

describe('GetFileTreeHandler', () => {
  let handler: GetFileTreeHandler;
  let fileSystemRepo: MockFileSystemRepository;

  beforeEach(() => {
    fileSystemRepo = new MockFileSystemRepository();
    handler = new GetFileTreeHandler(fileSystemRepo);
  });

  it('should return error when root folder is not found', async () => {
    const query = new GetFileTreeQuery('ws-1');
    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Folder not found at path: .');
  });

  it('should return full tree when no parentPath is provided', async () => {
    fileSystemRepo.seedTree();

    const query = new GetFileTreeQuery('ws-1');
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.root.path).toBe('.');
    expect(dto.totalFiles).toBe(3);
    expect(dto.totalFolders).toBe(3); // root + src + components
    expect(dto.root.children).toHaveLength(2);
  });

  it('should return subtree when parentPath is provided', async () => {
    fileSystemRepo.seedTree();

    const query = new GetFileTreeQuery('ws-1', 'src');
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.root.path).toBe('src');
    expect(dto.totalFiles).toBe(2); // App.tsx + Button.tsx
    expect(dto.totalFolders).toBe(2); // src + components
    expect(dto.root.children).toHaveLength(2);
  });

  it('should return deep subtree when parentPath is a nested folder', async () => {
    fileSystemRepo.seedTree();

    const query = new GetFileTreeQuery('ws-1', 'src/components');
    const result = await handler.execute(query);

    expect(result.isSuccess).toBe(true);
    const dto = result.getValue()!;
    expect(dto.root.path).toBe('src/components');
    expect(dto.totalFiles).toBe(1);
    expect(dto.totalFolders).toBe(1);
    expect(dto.root.children).toHaveLength(1);
    expect(dto.root.children[0].name).toBe('Button.tsx');
  });

  it('should return error when parentPath points to a file', async () => {
    fileSystemRepo.seedTree();

    const query = new GetFileTreeQuery('ws-1', 'readme.md');
    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Folder not found at path: readme.md');
  });

  it('should return error when parentPath does not exist', async () => {
    fileSystemRepo.seedTree();

    const query = new GetFileTreeQuery('ws-1', 'nonexistent');
    const result = await handler.execute(query);

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Folder not found at path: nonexistent');
  });
});