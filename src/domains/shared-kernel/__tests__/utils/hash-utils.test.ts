import { HashUtils } from '../../utils/hash-utils';

describe('HashUtils', () => {
  it('should hash a simple string', () => {
    const hash = HashUtils.sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce identical hashes for CRLF and LF', () => {
    const crlf = 'line1\r\nline2\r\nline3';
    const lf = 'line1\nline2\nline3';
    expect(HashUtils.sha256(crlf)).toBe(HashUtils.sha256(lf));
  });

  it('should produce different hashes for different content', () => {
    const a = HashUtils.sha256('a');
    const b = HashUtils.sha256('b');
    expect(a).not.toBe(b);
  });
});