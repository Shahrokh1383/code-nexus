import { FolderNodeId } from '../../../domain/value-objects/folder-node-id';

describe('FolderNodeId', () => {
  it('should create a valid FolderNodeId', () => {
    const id = new FolderNodeId('folder-456');
    expect(id.value).toBe('folder-456');
  });

  it('should throw when value is empty', () => {
    expect(() => new FolderNodeId('')).toThrow('Identifier value cannot be empty');
  });

  it('should equal another FolderNodeId with the same value', () => {
    const id1 = new FolderNodeId('folder-a');
    const id2 = new FolderNodeId('folder-a');
    expect(id1.equals(id2)).toBe(true);
  });

  it('should not equal a different FolderNodeId', () => {
    const id1 = new FolderNodeId('a');
    const id2 = new FolderNodeId('b');
    expect(id1.equals(id2)).toBe(false);
  });
});