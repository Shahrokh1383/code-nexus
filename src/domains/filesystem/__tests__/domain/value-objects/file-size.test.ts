import { FileSize } from '../../../domain/value-objects/file-size';
import { DomainException } from '../../../../shared-kernel/exceptions/domain-exception';

describe('FileSize', () => {
  it('should create a valid file size', () => {
    const size = new FileSize(1024);
    expect(size.bytes).toBe(1024);
  });

  it('should allow zero bytes', () => {
    const size = new FileSize(0);
    expect(size.bytes).toBe(0);
  });

  it('should throw for negative size', () => {
    expect(() => new FileSize(-1)).toThrow(DomainException);
  });

  it('should throw for non-integer size', () => {
    expect(() => new FileSize(100.5)).toThrow(DomainException);
  });

  it('should throw for NaN', () => {
    expect(() => new FileSize(NaN)).toThrow(DomainException);
  });

  it('should throw for Infinity', () => {
    expect(() => new FileSize(Infinity)).toThrow(DomainException);
  });

  it('should equal another FileSize with the same bytes', () => {
    const s1 = new FileSize(2048);
    const s2 = new FileSize(2048);
    expect(s1.equals(s2)).toBe(true);
  });

  it('should not equal a different FileSize', () => {
    const s1 = new FileSize(100);
    const s2 = new FileSize(200);
    expect(s1.equals(s2)).toBe(false);
  });
});