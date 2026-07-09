import { DocFolderId } from '../../../domain/value-objects/doc-folder-id';

describe('DocFolderId', () => {
  it('should generate a unique identifier', () => {
    const id1 = DocFolderId.generate();
    const id2 = DocFolderId.generate();

    expect(id1).toBeInstanceOf(DocFolderId);
    expect(id1.value).toHaveLength(36);
    expect(id1.value).not.toBe(id2.value);
  });

  it('should wrap a provided string value', () => {
    const id = new DocFolderId('folder-123');
    expect(id.value).toBe('folder-123');
  });

  it('should throw on empty value', () => {
    expect(() => new DocFolderId('')).toThrow('Identifier value cannot be empty');
  });

  it('should support equality comparison', () => {
    const id1 = new DocFolderId('same');
    const id2 = new DocFolderId('same');
    const id3 = new DocFolderId('different');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});