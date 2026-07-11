import { DiffId } from '../../../domain/value-objects/diff-id';

describe('DiffId', () => {
  it('should create with valid value', () => {
    const id = new DiffId('diff-123');
    expect(id.value).toBe('diff-123');
  });

  it('should throw on empty value', () => {
    expect(() => new DiffId('')).toThrow('Identifier value cannot be empty');
  });

  it('should equal same value', () => {
    const a = new DiffId('diff-123');
    const b = new DiffId('diff-123');
    expect(a.equals(b)).toBe(true);
  });

  it('should not equal different value', () => {
    const a = new DiffId('diff-123');
    const b = new DiffId('diff-456');
    expect(a.equals(b)).toBe(false);
  });

  it('should convert to string', () => {
    const id = new DiffId('diff-123');
    expect(id.toString()).toBe('diff-123');
  });
});