import { Identifier } from '../../types/identifier';

describe('Identifier', () => {
  it('should store and return the value', () => {
    const id = new Identifier('abc-123');
    expect(id.value).toBe('abc-123');
  });

  it('should trim whitespace', () => {
    const id = new Identifier('  abc  ');
    expect(id.value).toBe('abc');
  });

  it('should throw on empty string', () => {
    expect(() => new Identifier('')).toThrow('Identifier value cannot be empty');
  });

  it('should throw on whitespace-only string', () => {
    expect(() => new Identifier('   ')).toThrow('Identifier value cannot be empty');
  });

  it('should return true for equal identifiers', () => {
    const a = new Identifier('x');
    const b = new Identifier('x');
    expect(a.equals(b)).toBe(true);
  });

  it('should return false for different identifiers', () => {
    const a = new Identifier('x');
    const b = new Identifier('y');
    expect(a.equals(b)).toBe(false);
  });

  it('should convert to string', () => {
    const id = new Identifier('test');
    expect(id.toString()).toBe('test');
  });
});