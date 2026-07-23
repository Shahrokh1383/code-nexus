import { DocumentLinkId } from '../../../domain/value-objects/document-link-id';

describe('DocumentLinkId', () => {
  it('should generate a unique id', () => {
    const id1 = DocumentLinkId.generate();
    const id2 = DocumentLinkId.generate();

    expect(id1.value).toBeDefined();
    expect(id1.value.length).toBeGreaterThan(0);
    expect(id1.equals(id2)).toBe(false);
  });

  it('should create from a given string', () => {
    const id = new DocumentLinkId('my-id');
    expect(id.value).toBe('my-id');
  });

  it('should consider two ids with same value equal', () => {
    const a = new DocumentLinkId('abc');
    const b = new DocumentLinkId('abc');
    expect(a.equals(b)).toBe(true);
  });
});