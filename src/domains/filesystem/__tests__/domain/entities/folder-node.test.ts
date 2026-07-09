import { FolderNode } from '../../../domain/entities/folder-node';
import { FolderNodeId } from '../../../domain/value-objects/folder-node-id';
import { FileNodeId } from '../../../domain/value-objects/file-node-id';
import { FilePath } from '../../../domain/value-objects/file-path';
import { FileNode } from '../../../domain/entities/file-node';
import { FileSize } from '../../../domain/value-objects/file-size';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { DomainException } from '../../../../shared-kernel/exceptions/domain-exception';

describe('FolderNode', () => {
  const createFolderNode = (
    id: string,
    path: string,
    name: string
  ): FolderNode => {
    return new FolderNode(new FolderNodeId(id), new FilePath(path), name);
  };

  const createFileNode = (
    id: string,
    path: string,
    name: string
  ): FileNode => {
    return new FileNode(
      new FileNodeId(id),
      new FilePath(path),
      name,
      new FilePath(path).getParentPath(),
      new FileSize(100),
      DateTime.now(),
      Maybe.none(),
      false
    );
  };

  it('should create a valid folder node', () => {
    const folder = createFolderNode('folder-1', 'src', 'src');
    expect(folder.id.value).toBe('folder-1');
    expect(folder.path.value).toBe('src');
    expect(folder.name).toBe('src');
    expect(folder.children).toHaveLength(0);
  });

  it('should add a child file node', () => {
    const folder = createFolderNode('folder-1', 'src', 'src');
    const file = createFileNode('file-1', 'src/index.ts', 'index.ts');
    folder.addChild(file);
    expect(folder.children).toHaveLength(1);
    expect(folder.children[0].id.value).toBe('file-1');
  });

  it('should add a child folder node', () => {
    const root = createFolderNode('root', '.', '.');
    const child = createFolderNode('child', 'src', 'src');
    root.addChild(child);
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBeInstanceOf(FolderNode);
  });

  it('should throw when adding a child with mismatched parent path', () => {
    const folder = createFolderNode('folder-1', 'src', 'src');
    const file = createFileNode('file-1', 'wrong/index.ts', 'index.ts');
    expect(() => folder.addChild(file)).toThrow(DomainException);
  });

  it('should throw when adding a duplicate child', () => {
    const folder = createFolderNode('folder-1', 'src', 'src');
    const file = createFileNode('file-1', 'src/index.ts', 'index.ts');
    folder.addChild(file);
    expect(() => folder.addChild(file)).toThrow(DomainException);
  });

  it('should remove a child by id', () => {
    const folder = createFolderNode('folder-1', 'src', 'src');
    const file = createFileNode('file-1', 'src/index.ts', 'index.ts');
    folder.addChild(file);
    folder.removeChild(file.id);
    expect(folder.children).toHaveLength(0);
  });

  it('should throw when removing a non-existent child', () => {
    const folder = createFolderNode('folder-1', 'src', 'src');
    const missingId = new FileNodeId('missing');
    expect(() => folder.removeChild(missingId)).toThrow(DomainException);
  });

  it('should get all file descendants recursively', () => {
    const root = createFolderNode('root', '.', '.');
    const src = createFolderNode('src', 'src', 'src');
    const components = createFolderNode('components', 'src/components', 'components');
    const button = createFileNode('button', 'src/components/Button.tsx', 'Button.tsx');
    const app = createFileNode('app', 'src/App.tsx', 'App.tsx');

    components.addChild(button);
    src.addChild(components);
    src.addChild(app);
    root.addChild(src);

    const descendants = root.getAllDescendants();
    expect(descendants).toHaveLength(2);
    expect(descendants.map(d => d.name)).toContain('Button.tsx');
    expect(descendants.map(d => d.name)).toContain('App.tsx');
  });

  it('should return empty array for folder with no file descendants', () => {
    const folder = createFolderNode('empty', 'empty', 'empty');
    const subFolder = createFolderNode('sub', 'empty/sub', 'sub');
    folder.addChild(subFolder);
    expect(folder.getAllDescendants()).toHaveLength(0);
  });
});