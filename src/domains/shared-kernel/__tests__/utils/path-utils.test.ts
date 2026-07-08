import { PathUtils } from '../../utils/path-utils';

describe('PathUtils', () => {
  describe('normalize', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(PathUtils.normalize('a\\b\\c')).toBe('a/b/c');
    });

    it('should remove trailing slash', () => {
      expect(PathUtils.normalize('a/b/c/')).toBe('a/b/c');
    });

    it('should collapse multiple slashes', () => {
      expect(PathUtils.normalize('a//b///c')).toBe('a/b/c');
    });
  });

  describe('join', () => {
    it('should join multiple paths', () => {
      expect(PathUtils.join('a', 'b', 'c')).toBe('a/b/c');
    });

    it('should normalize joined paths', () => {
      expect(PathUtils.join('a\\b', 'c\\d')).toBe('a/b/c/d');
    });
  });

  describe('relative', () => {
    it('should compute relative path', () => {
      expect(PathUtils.relative('a/b', 'a/b/c/d')).toBe('c/d');
    });

    it('should use parent references', () => {
      expect(PathUtils.relative('a/b/c', 'a/x')).toBe('../../x');
    });

    it('should return dot for same path', () => {
      expect(PathUtils.relative('a/b', 'a/b')).toBe('.');
    });
  });

  describe('isWithin', () => {
    it('should return true for child path', () => {
      expect(PathUtils.isWithin('a/b', 'a/b/c')).toBe(true);
    });

    it('should return true for same path', () => {
      expect(PathUtils.isWithin('a/b', 'a/b')).toBe(true);
    });

    it('should return false for sibling path', () => {
      expect(PathUtils.isWithin('a/b', 'a/c')).toBe(false);
    });

    it('should return false for path traversal attempt', () => {
      expect(PathUtils.isWithin('a/b', 'a/b/../../c')).toBe(false);
    });
  });
});