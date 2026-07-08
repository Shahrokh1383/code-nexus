import { Maybe } from '../../types/maybe';

describe('Maybe', () => {
  it('should hold a value for some()', () => {
    const m = Maybe.some(5);
    expect(m.isSome).toBe(true);
    expect(m.isNone).toBe(false);
    expect(m.getOrElse(0)).toBe(5);
  });

  it('should be empty for none()', () => {
    const m = Maybe.none<number>();
    expect(m.isSome).toBe(false);
    expect(m.isNone).toBe(true);
    expect(m.getOrElse(99)).toBe(99);
  });

  it('should map over a value', () => {
    const m = Maybe.some(3).map((v) => v * 2);
    expect(m.getOrElse(0)).toBe(6);
  });

  it('should return none on map of none', () => {
    const m = Maybe.none<number>().map((v) => v * 2);
    expect(m.isNone).toBe(true);
  });

  it('should flatMap over a value', () => {
    const m = Maybe.some(3).flatMap((v) => Maybe.some(v * 2));
    expect(m.getOrElse(0)).toBe(6);
  });

  it('should return null for getOrNull on none', () => {
    const m = Maybe.none<number>();
    expect(m.getOrNull()).toBeNull();
  });
});