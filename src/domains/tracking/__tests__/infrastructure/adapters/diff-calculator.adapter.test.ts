import { DiffCalculatorAdapter } from '../../../infrastructure/adapters/diff-calculator.adapter';
import { DiffLine, DiffLineType } from '../../../domain/value-objects/diff-line';

describe('DiffCalculatorAdapter', () => {
  let calculator: DiffCalculatorAdapter;

  beforeEach(() => {
    calculator = new DiffCalculatorAdapter();
  });

  describe('computeDiff', () => {
    it('should return empty diff for identical arrays', () => {
      const lines = ['a', 'b', 'c'];
      const result = calculator.computeDiff(lines, lines);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    });

    it('should detect added lines at the end', () => {
      const oldLines = ['a', 'b'];
      const newLines = ['a', 'b', 'c', 'd'];
      const result = calculator.computeDiff(oldLines, newLines);

      expect(result.added).toEqual([
        new DiffLine(3, 'c', DiffLineType.ADDED),
        new DiffLine(4, 'd', DiffLineType.ADDED),
      ]);
      expect(result.removed).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    });

    it('should detect removed lines at the end', () => {
      const oldLines = ['a', 'b', 'c'];
      const newLines = ['a', 'b'];
      const result = calculator.computeDiff(oldLines, newLines);

      expect(result.removed).toEqual([
        new DiffLine(3, 'c', DiffLineType.REMOVED),
      ]);
      expect(result.added).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
    });

    it('should detect modified lines (same position, different content)', () => {
      const oldLines = ['a', 'b', 'c'];
      const newLines = ['a', 'x', 'c'];
      const result = calculator.computeDiff(oldLines, newLines);

      expect(result.modified).toEqual([
        new DiffLine(2, 'x', DiffLineType.MODIFIED),
      ]);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
    });

    it('should handle mix of added, removed, and modified lines', () => {
      const oldLines = ['line1', 'line2', 'line3', 'line4'];
      const newLines = ['line1', 'line2-changed', 'line3', 'line5'];

      const result = calculator.computeDiff(oldLines, newLines);

      expect(result.modified).toEqual([
        new DiffLine(2, 'line2-changed', DiffLineType.MODIFIED),
      ]);
      expect(result.added).toEqual([
        new DiffLine(4, 'line5', DiffLineType.ADDED),
      ]);
      expect(result.removed).toEqual([
        new DiffLine(4, 'line4', DiffLineType.REMOVED),
      ]);
    });

    it('should treat a line that appears later as added after previous removals', () => {
      const oldLines = ['a', 'b', 'c'];
      const newLines = ['a', 'c', 'b'];
      // b removed from pos 2, added at pos 3
      const result = calculator.computeDiff(oldLines, newLines);

      expect(result.removed).toEqual([
        new DiffLine(2, 'b', DiffLineType.REMOVED),
      ]);
      expect(result.added).toEqual([
        new DiffLine(3, 'b', DiffLineType.ADDED),
      ]);
      expect(result.modified).toHaveLength(0);
    });

    it('should handle empty old array (all lines added)', () => {
      const result = calculator.computeDiff([], ['x', 'y']);
      expect(result.added).toEqual([
        new DiffLine(1, 'x', DiffLineType.ADDED),
        new DiffLine(2, 'y', DiffLineType.ADDED),
      ]);
    });

    it('should handle empty new array (all lines removed)', () => {
      const result = calculator.computeDiff(['x', 'y'], []);
      expect(result.removed).toEqual([
        new DiffLine(1, 'x', DiffLineType.REMOVED),
        new DiffLine(2, 'y', DiffLineType.REMOVED),
      ]);
    });

    it('should handle multiple consecutive changes correctly', () => {
      const oldLines = ['a', 'b', 'c', 'd', 'e'];
      const newLines = ['a', 'x', 'd', 'e', 'f'];
      const result = calculator.computeDiff(oldLines, newLines);

      expect(result.removed).toEqual([
        new DiffLine(2, 'b', DiffLineType.REMOVED),
        new DiffLine(3, 'c', DiffLineType.REMOVED),
      ]);
      expect(result.added).toEqual([
        new DiffLine(2, 'x', DiffLineType.ADDED),
        new DiffLine(5, 'f', DiffLineType.ADDED),
      ]);
      // The algorithm may also report a modification instead; based on current lookahead,
      // b and c removed, x added, f added. No modification expected.
      expect(result.modified).toHaveLength(0);
    });
  });
});