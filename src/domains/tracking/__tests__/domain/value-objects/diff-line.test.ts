import { DiffLine, DiffLineType } from '../../../domain/value-objects/diff-line';

describe('DiffLine', () => {
  it('should create with valid params', () => {
    const line = new DiffLine(1, 'const x = 1;', DiffLineType.ADDED);
    expect(line.lineNumber).toBe(1);
    expect(line.content).toBe('const x = 1;');
    expect(line.type).toBe(DiffLineType.ADDED);
  });

  it('should throw on line number less than 1', () => {
    expect(() => new DiffLine(0, 'code', DiffLineType.ADDED)).toThrow(
      'Line number must be at least 1'
    );
  });

  it('should throw on negative line number', () => {
    expect(() => new DiffLine(-1, 'code', DiffLineType.REMOVED)).toThrow(
      'Line number must be at least 1'
    );
  });

  it('should equal same values', () => {
    const a = new DiffLine(1, 'code', DiffLineType.MODIFIED);
    const b = new DiffLine(1, 'code', DiffLineType.MODIFIED);
    expect(a.equals(b)).toBe(true);
  });

  it('should not equal different line number', () => {
    const a = new DiffLine(1, 'code', DiffLineType.ADDED);
    const b = new DiffLine(2, 'code', DiffLineType.ADDED);
    expect(a.equals(b)).toBe(false);
  });

  it('should not equal different content', () => {
    const a = new DiffLine(1, 'codeA', DiffLineType.ADDED);
    const b = new DiffLine(1, 'codeB', DiffLineType.ADDED);
    expect(a.equals(b)).toBe(false);
  });

  it('should not equal different type', () => {
    const a = new DiffLine(1, 'code', DiffLineType.ADDED);
    const b = new DiffLine(1, 'code', DiffLineType.REMOVED);
    expect(a.equals(b)).toBe(false);
  });

  it('should not equal non-DiffLine', () => {
    const line = new DiffLine(1, 'code', DiffLineType.ADDED);
    expect(line.equals({} as any)).toBe(false);
  });

  it('should convert to string', () => {
    const line = new DiffLine(5, 'const x = 1;', DiffLineType.ADDED);
    expect(line.toString()).toBe('ADDED[5]: const x = 1;');
  });
});