import { LinkType } from '../../../domain/value-objects/link-type';

describe('LinkType Value Object', () => {
  it('should create a DIRECT link type', () => {
    const type = LinkType.direct();
    
    expect(type.isDirect()).toBe(true);
    expect(type.isInherited()).toBe(false);
    expect(type.value).toBe('DIRECT');
    expect(type.toString()).toBe('DIRECT');
  });

  it('should create an INHERITED link type', () => {
    const type = LinkType.inherited();
    
    expect(type.isInherited()).toBe(true);
    expect(type.isDirect()).toBe(false);
    expect(type.value).toBe('INHERITED');
    expect(type.toString()).toBe('INHERITED');
  });

  it('should evaluate equality correctly between identical types', () => {
    const direct1 = LinkType.direct();
    const direct2 = LinkType.direct();
    const inherited1 = LinkType.inherited();
    const inherited2 = LinkType.inherited();

    expect(direct1.equals(direct2)).toBe(true);
    expect(inherited1.equals(inherited2)).toBe(true);
  });

  it('should evaluate inequality correctly between different types', () => {
    const direct = LinkType.direct();
    const inherited = LinkType.inherited();

    expect(direct.equals(inherited)).toBe(false);
    expect(inherited.equals(direct)).toBe(false);
  });

  it('should safely handle equality checks with non-LinkType objects', () => {
    const type = LinkType.direct();

    expect(type.equals(null as any)).toBe(false);
    expect(type.equals(undefined as any)).toBe(false);
    expect(type.equals({} as any)).toBe(false);
    expect(type.equals('DIRECT' as any)).toBe(false);
  });
});