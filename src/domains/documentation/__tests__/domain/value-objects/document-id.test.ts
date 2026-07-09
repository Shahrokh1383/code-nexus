import { DocumentId } from '../../../domain/value-objects/document-id';

describe('DocumentId', () => {
  it('should generate a unique identifier', () => {
    const id1 = DocumentId.generate();
    const id2 = DocumentId.generate();

    expect(id1).toBeInstanceOf(DocumentId);
    expect(id1.value).toHaveLength(36);
    expect(id1.value).not.toBe(id2.value);
  });

  it('should wrap a provided string value', () => {
    const id = new DocumentId('doc-123');
    expect(id.value).toBe('doc-123');
  });

  it('should throw on empty value', () => {
    expect(() => new DocumentId('')).toThrow('Identifier value cannot be empty');
  });

  it('should support equality comparison', () => {
    const id1 = new DocumentId('same');
    const id2 = new DocumentId('same');
    const id3 = new DocumentId('different');

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });
});