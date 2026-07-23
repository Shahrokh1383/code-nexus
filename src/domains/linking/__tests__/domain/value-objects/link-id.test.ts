import { LinkId } from '../../../domain/value-objects/link-id';

describe('LinkId', () => {
  it('should generate a unique id', () => {
    const id1 = LinkId.generate();
    const id2 = LinkId.generate();

    expect(id1.value).toBeDefined();
    expect(id1.value.length).toBeGreaterThan(0);
    expect(id1.equals(id2)).toBe(false);
  });

  it('should create from a given string', () => {
    const id = new LinkId('link-123');
    expect(id.value).toBe('link-123');
  });

  it('should be equal when values match', () => {
    const a = new LinkId('same');
    const b = new LinkId('same');
    expect(a.equals(b)).toBe(true);
  });
});