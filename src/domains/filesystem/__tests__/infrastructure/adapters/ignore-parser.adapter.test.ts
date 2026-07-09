import { IgnoreParserAdapter, IgnoreMatcher } from '../../../infrastructure/adapters/ignore-parser.adapter';

describe('IgnoreParserAdapter', () => {
  let parser: IgnoreParserAdapter;

  beforeEach(() => {
    parser = new IgnoreParserAdapter();
  });

  describe('IgnoreMatcher', () => {
    it('should match simple exact patterns', () => {
      const matcher = new IgnoreMatcher(['debug.log']);
      expect(matcher.test('debug.log')).toBe(true);
      expect(matcher.test('other.log')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      const matcher = new IgnoreMatcher(['*.ts']);
      expect(matcher.test('index.ts')).toBe(true);
      expect(matcher.test('App.tsx')).toBe(false);
      expect(matcher.test('src/index.ts')).toBe(false);
    });

    it('should match double-star patterns', () => {
      const matcher = new IgnoreMatcher(['**/*.log']);
      expect(matcher.test('error.log')).toBe(true);
      expect(matcher.test('src/error.log')).toBe(true);
      expect(matcher.test('deep/nested/debug.log')).toBe(true);
    });

    it('should match directory patterns', () => {
      const matcher = new IgnoreMatcher(['node_modules/']);
      expect(matcher.test('node_modules')).toBe(true);
      expect(matcher.test('node_modules/lodash/index.js')).toBe(true);
      expect(matcher.test('src/node_modules')).toBe(false);
    });

    it('should handle negation patterns', () => {
      const matcher = new IgnoreMatcher(['*.ts', '!important.ts']);
      expect(matcher.test('app.ts')).toBe(true);
      expect(matcher.test('important.ts')).toBe(false);
    });

    it('should handle single-character wildcard', () => {
      const matcher = new IgnoreMatcher(['temp?']);
      expect(matcher.test('temp1')).toBe(true);
      expect(matcher.test('tempA')).toBe(true);
      expect(matcher.test('temp')).toBe(false);
    });

    it('should handle multiple patterns with last match wins', () => {
      const matcher = new IgnoreMatcher(['src/', '!src/keep/']);
      expect(matcher.test('src/file.ts')).toBe(true);
      expect(matcher.test('src/keep/file.ts')).toBe(false);
    });
  });

  describe('isIgnored', () => {
    it('should delegate to matcher', () => {
      const matcher = parser.parse(['*.log']);
      expect(parser.isIgnored('debug.log', matcher)).toBe(true);
      expect(parser.isIgnored('debug.ts', matcher)).toBe(false);
    });
  });
});