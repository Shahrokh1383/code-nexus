import { FileNode } from '../../../domain/entities/file-node';
import { FileNodeId } from '../../../domain/value-objects/file-node-id';
import { FilePath } from '../../../domain/value-objects/file-path';
import { FileSize } from '../../../domain/value-objects/file-size';
import { FileHash } from '../../../domain/value-objects/file-hash';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { Maybe } from '../../../../shared-kernel/types/maybe';
import { DomainException } from '../../../../shared-kernel/exceptions/domain-exception';

describe('FileNode', () => {
  const validHash = 'a'.repeat(64);

  const createFileNode = (overrides: Partial<ConstructorParameters<typeof FileNode>[0]> = {}): FileNode => {
    return new FileNode(
      overrides._id || new FileNodeId('file-1'),
      overrides._path || new FilePath('src/index.ts'),
      overrides._name || 'index.ts',
      overrides._parentPath || new FilePath('src'),
      overrides._size || new FileSize(100),
      overrides._lastModified || DateTime.fromISO('2024-01-01T00:00:00.000Z'),
      overrides._hash || Maybe.none<FileHash>(),
      overrides._isDirectory ?? false
    );
  };

  it('should create a valid file node', () => {
    const node = createFileNode();
    expect(node.id.value).toBe('file-1');
    expect(node.path.value).toBe('src/index.ts');
    expect(node.name).toBe('index.ts');
    expect(node.parentPath.value).toBe('src');
    expect(node.size.bytes).toBe(100);
    expect(node.isDirectory).toBe(false);
    expect(node.hash.isNone).toBe(true);
  });

  it('should create a file node with a hash', () => {
    const node = createFileNode({ _hash: Maybe.some(new FileHash(validHash)) });
    expect(node.hash.isSome).toBe(true);
    expect(node.hash.getOrNull()?.value).toBe(validHash);
  });

  it('should create a directory file node', () => {
    const node = createFileNode({ _isDirectory: true });
    expect(node.isDirectory).toBe(true);
  });

  it('should throw when parent path does not match file path', () => {
    expect(() =>
      createFileNode({
        _path: new FilePath('src/components/Button.tsx'),
        _parentPath: new FilePath('wrong'),
      })
    ).toThrow(DomainException);
  });

  it('should expose lastModified as DateTime', () => {
    const dt = DateTime.fromISO('2024-06-15T12:30:00.000Z');
    const node = createFileNode({ _lastModified: dt });
    expect(node.lastModified.toISO()).toBe('2024-06-15T12:30:00.000Z');
  });
});