import { DiffCalculatorService } from '../../../domain/services/diff-calculator.service';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DiffLine } from '../../../domain/value-objects/diff-line';
import { DiffLineType } from '../../../domain/value-objects/diff-line';
import { IDiffCalculator } from '../../../application/ports/diff-calculator.interface';


function buildLineDiff(oldLines: string[], newLines: string[]) {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const added: DiffLine[] = [];
  const removed: DiffLine[] = [];
  const modified: DiffLine[] = [];

  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      added.push(new DiffLine(j, newLines[j - 1], DiffLineType.ADDED));
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {

      removed.push(new DiffLine(i, oldLines[i - 1], DiffLineType.REMOVED));
      i--;
    } else {
      i--;
      j--;
    }
  }

  added.reverse();
  removed.reverse();

  const finalAdded: DiffLine[] = [];
  const finalRemoved: DiffLine[] = [];
  const finalModified: DiffLine[] = [];

  while (removed.length > 0 && added.length > 0) {
    const rem = removed.shift()!;
    const add = added.shift()!;
    finalModified.push(new DiffLine(add.lineNumber, add.content, DiffLineType.MODIFIED));
  }
  finalAdded.push(...added);
  finalRemoved.push(...removed);

  return { added: finalAdded, removed: finalRemoved, modified: finalModified };
}

const mockDiffCalculator: IDiffCalculator = {
  computeDiff(oldLines: string[], newLines: string[]) {
    return buildLineDiff(oldLines, newLines);
  },
};

describe('DiffCalculatorService', () => {
  const service = new DiffCalculatorService(mockDiffCalculator);
  const filePath = new FilePath('src/app.ts');
  const oldHash = new HashValue('a'.repeat(64));
  const newHash = new HashValue('b'.repeat(64));

  it('should return empty diff for identical content', () => {
    const diff = service.calculate('line1\nline2', 'line1\nline2', filePath, oldHash, newHash);
    expect(diff.isEmpty()).toBe(true);
    expect(diff.addedLines.length).toBe(0);
    expect(diff.removedLines.length).toBe(0);
    expect(diff.modifiedLines.length).toBe(0);
  });

  it('should detect added lines', () => {
    const diff = service.calculate(
      'line1\nline2',
      'line1\nnewLine\nline2',
      filePath,
      oldHash,
      newHash
    );
    expect(diff.addedLines.length).toBe(1);
    expect(diff.addedLines[0].content).toBe('newLine');
    expect(diff.addedLines[0].type).toBe(DiffLineType.ADDED);
  });

  it('should detect removed lines', () => {
    const diff = service.calculate(
      'line1\noldLine\nline2',
      'line1\nline2',
      filePath,
      oldHash,
      newHash
    );
    expect(diff.removedLines.length).toBe(1);
    expect(diff.removedLines[0].content).toBe('oldLine');
    expect(diff.removedLines[0].type).toBe(DiffLineType.REMOVED);
  });

  it('should detect modified lines', () => {
    const diff = service.calculate(
      'line1\noldCode\nline2',
      'line1\nnewCode\nline2',
      filePath,
      oldHash,
      newHash
    );
    expect(diff.modifiedLines.length).toBe(1);
    expect(diff.modifiedLines[0].content).toBe('newCode');
    expect(diff.modifiedLines[0].type).toBe(DiffLineType.MODIFIED);
  });

  it('should handle mixed changes', () => {
    const diff = service.calculate(
      'a\nb\nc',
      'a\nx\nc\nd',
      filePath,
      oldHash,
      newHash
    );
    expect(
      diff.modifiedLines.length + diff.addedLines.length + diff.removedLines.length
    ).toBeGreaterThan(0);
    expect(diff.isEmpty()).toBe(false);
  });

  it('should set correct oldHash and newHash', () => {
    const diff = service.calculate('a', 'b', filePath, oldHash, newHash);
    expect(diff.oldHash.equals(oldHash)).toBe(true);
    expect(diff.newHash.equals(newHash)).toBe(true);
  });

  it('should set correct filePath', () => {
    const diff = service.calculate('a', 'b', filePath, oldHash, newHash);
    expect(diff.filePath.equals(filePath)).toBe(true);
  });

  it('should be pure (no side effects)', () => {
    const content1 = 'line1\nline2';
    const content2 = 'line1\nline3';
    const diff1 = service.calculate(content1, content2, filePath, oldHash, newHash);
    const diff2 = service.calculate(content1, content2, filePath, oldHash, newHash);
    expect(diff1.isEmpty()).toBe(diff2.isEmpty());
    expect(diff1.addedLines.length).toBe(diff2.addedLines.length);
  });

  it('should handle empty old content', () => {
    const diff = service.calculate('', 'line1\nline2', filePath, oldHash, newHash);
    expect(diff.addedLines.length).toBe(2);
    expect(diff.isEmpty()).toBe(false);
  });

  it('should handle empty new content', () => {
    const diff = service.calculate('line1\nline2', '', filePath, oldHash, newHash);
    expect(diff.removedLines.length).toBe(2);
    expect(diff.isEmpty()).toBe(false);
  });
});