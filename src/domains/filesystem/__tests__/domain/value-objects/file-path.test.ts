import { FilePath } from '../../../../domain/value-objects/file-path';
import { DomainException } from '../../../../../shared-kernel/exceptions/domain-exception';

describe('FilePath', () => {
  it('should create a valid relative file path', () => {
    const path = new FilePath('src/components/Button.tsx');
    expect(path.value).toBe('src/components/Button.tsx');
  });

  it('should normalize backslashes to forward slashes', () => {
    const path = new FilePath('src\\components\\Button.tsx');
    expect(path.value).toBe('src/components/Button.tsx');
  });

  it('should normalize multiple consecutive slashes', () => {
    const path = new FilePath('src//components///Button.tsx');
    expect(path.value).toBe('src/components/Button.tsx');
  });

  it('should extract the file name', () => {
    const path = new FilePath('src/components/Button.tsx');
    expect(path.getName()).toBe('Button.tsx');
  });

  it('should extract the parent path', () => {
    const path = new FilePath('src/components/Button.tsx');
    expect(path.getParentPath().value).toBe('src/components');
  });

  it('should return "." as parent for a root-level file', () => {
    const path = new FilePath('readme.md');
    expect(path.getParentPath().value).toBe('.');
  });

  it('should throw for empty string', () => {
    expect(() => new FilePath('')).toThrow(DomainException);
  });

  it('should throw for absolute Unix path', () => {
    expect(() => new FilePath('/home/user/file.ts')).toThrow(DomainException);
  });

  it('should throw for absolute Windows path', () => {
    expect(() => new FilePath('C:/Users/file.ts')).toThrow(DomainException);
  });

  it('should throw for path containing ".."', () => {
    expect(() => new FilePath('../secret.ts')).toThrow(DomainException);
  });

  it('should throw for path containing traversal in middle', () => {
    expect(() => new FilePath('src/../../secret.ts')).toThrow(DomainException);
  });

  it('should throw for "." only path', () => {
    expect(() => new FilePath('.')).toThrow(DomainException);
  });

  it('should equal another FilePath with the same value', () => {
    const p1 = new FilePath('src/file.ts');
    const p2 = new FilePath('src/file.ts');
    expect(p1.equals(p2)).toBe(true);
  });

  it('should not equal a different FilePath', () => {
    const p1 = new FilePath('a.ts');
    const p2 = new FilePath('b.ts');
    expect(p1.equals(p2)).toBe(false);
  });
});