import { LinkGraphId } from '../../../domain/value-objects/link-graph-id';

describe('LinkGraphId', () => {
  it('should generate a unique id', () => {
    const id1 = LinkGraphId.generate();
    const id2 = LinkGraphId.generate();

    expect(id1.value).toBeDefined();
    expect(id1.value.length).toBeGreaterThan(0);
    expect(id1.equals(id2)).toBe(false);
  });

  it('should create from a given string', () => {
    const id = new LinkGraphId('graph-1');
    expect(id.value).toBe('graph-1');
  });
});