import { FileHash } from '../../../../domain/value-objects/file-hash';
import { DomainException } from '../../../../../shared-kernel/exceptions/domain-exception';

describe('FileHash', () => {
  const validHash = 'a'.repeat(64);

  it('should create a valid SHA-256 hash', () => {
    const hash = new FileHash(validHash);
    expect(hash.value).toBe(validHash);
  });

  it('should accept uppercase hex and normalize to lowercase', () => {
    const upperHash = 'A'.repeat(64);
    const hash = new FileHash(upperHash);
    expect(hash.value).toBe('a'.repeat(64));
  });

  it('should throw for empty string', () => {
    expect(() => new FileHash('')).toThrow(DomainException);
  });

  it('should throw for 63 characters', () => {
    expect(() => new FileHash('a'.repeat(63))).toThrow(DomainException);
  });

  it('should throw for 65 characters', () => {
    expect(() => new FileHash('a'.repeat(65))).toThrow(DomainException);
  });

  it('should throw for non-hex characters', () => {
    expect(() => new FileHash('g'.repeat(64))).toThrow(DomainException);
  });

  it('should equal another FileHash with the same value', () => {
    const h1 = new FileHash(validHash);
    const h2 = new FileHash(validHash);
    expect(h1.equals(h2)).toBe(true);
  });

  it('should not equal a different FileHash', () => {
    const h1 = new FileHash(validHash);
    const h2 = new FileHash('b'.repeat(64));
    expect(h1.equals(h2)).toBe(false);
  });
});