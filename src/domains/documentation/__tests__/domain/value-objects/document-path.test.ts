import { DocumentPath } from '../../../domain/value-objects/document-path';

describe('DocumentPath', () => {
  it('should normalize and store a relative path', () => {
    const path = new DocumentPath('docs/guide.md');
    expect(path.value).toBe('docs/guide.md');
  });

  it('should normalize backslashes to forward slashes', () => {
    const path = new DocumentPath('docs\\guide\\intro.md');
    expect(path.value).toBe('docs/guide/intro.md');
  });

  it('should reject empty paths', () => {
    expect(() => new DocumentPath('')).toThrow('Document path cannot be empty');
  });

  it('should reject absolute Unix paths', () => {
    expect(() => new DocumentPath('/docs/guide.md')).toThrow(
      'Document path must be relative, not absolute'
    );
  });

  it('should reject absolute Windows paths', () => {
    expect(() => new DocumentPath('C:\\docs\\guide.md')).toThrow(
      'Document path must be relative, not absolute'
    );
  });

  it('should support equality comparison', () => {
    const a = new DocumentPath('docs/a.md');
    const b = new DocumentPath('docs/a.md');
    const c = new DocumentPath('docs/b.md');

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('should return string representation', () => {
    const path = new DocumentPath('docs/readme.md');
    expect(path.toString()).toBe('docs/readme.md');
  });

  describe('isWithinDocsFolder', () => {
    it('should return true for paths within docs folder', () => {
      const path = new DocumentPath('docs/guide/intro.md');
      expect(path.isWithinDocsFolder('docs')).toBe(true);
    });

    it('should return false for paths outside docs folder', () => {
      const path = new DocumentPath('src/main.ts');
      expect(path.isWithinDocsFolder('docs')).toBe(false);
    });

    it('should return true for exact docs folder path', () => {
      const path = new DocumentPath('docs');
      expect(path.isWithinDocsFolder('docs')).toBe(true);
    });
  });
});