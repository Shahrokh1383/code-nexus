import { FileHashId } from '../../../domain/value-objects/file-hash-id';

describe('FileHashId', () => {
  it('should create with valid value', () => {
    const id = new FileHashId('fh-123');
    expect(id.value).toBe('fh-123');
  });

  it('should throw on empty value', () => {
    expect(() => new FileHashId('')).toThrow('Identifier value cannot be empty');
  });

  it('should equal same value', () => {
    const a = new FileHashId('fh-123');
    const b = new FileHashId('fh-123');
    expect(a.equals(b)).toBe(true);
  });

  it('should not equal different value', () => {
    const a = new FileHashId('fh-123');
    const b = new FileHashId('fh-456');
    expect(a.equals(b)).toBe(false);
  });

  it('should convert to string', () => {
    const id = new FileHashId('fh-123');
    expect(id.toString()).toBe('fh-123');
  });
});