import { HashValue } from '../../../domain/value-objects/hash-value';

describe('HashValue', () => {
  const validHash = 'a'.repeat(64);

  it('should create with valid 64-char hex', () => {
    const hash = new HashValue(validHash);
    expect(hash.value).toBe(validHash);
  });

  it('should accept uppercase hex and normalize to lowercase', () => {
    const hash = new HashValue('A'.repeat(64));
    expect(hash.value).toBe('a'.repeat(64));
  });

  it('should throw on too short string', () => {
    expect(() => new HashValue('a'.repeat(63))).toThrow(
      'HashValue must be a valid 64-character SHA-256 hex string'
    );
  });

  it('should throw on too long string', () => {
    expect(() => new HashValue('a'.repeat(65))).toThrow(
      'HashValue must be a valid 64-character SHA-256 hex string'
    );
  });

  it('should throw on non-hex characters', () => {
    expect(() => new HashValue('g'.repeat(64))).toThrow(
      'HashValue must be a valid 64-character SHA-256 hex string'
    );
  });

  it('should create from content', () => {
    const hash = HashValue.fromContent('hello world');
    expect(hash.value).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should normalize CRLF to LF before hashing', () => {
    const hash1 = HashValue.fromContent('line1\r\nline2');
    const hash2 = HashValue.fromContent('line1\nline2');
    expect(hash1.equals(hash2)).toBe(true);
  });

  it('should equal same hash', () => {
    const a = new HashValue(validHash);
    const b = new HashValue(validHash);
    expect(a.equals(b)).toBe(true);
  });

  it('should not equal different hash', () => {
    const a = new HashValue('a'.repeat(64));
    const b = new HashValue('b'.repeat(64));
    expect(a.equals(b)).toBe(false);
  });

  it('should not equal non-HashValue', () => {
    const hash = new HashValue(validHash);
    expect(hash.equals({} as any)).toBe(false);
  });

  it('should convert to string', () => {
    const hash = new HashValue(validHash);
    expect(hash.toString()).toBe(validHash);
  });
});