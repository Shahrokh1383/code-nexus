import { DiffLine, DiffLineType } from '../../domain/value-objects/diff-line';

export class DiffCalculatorAdapter {
  /**
   * Computes a line‑level diff.
   * - Uses LCS to find unchanged lines.
   * - Only reports a MODIFIED line if a block contains exactly one old line
   *   and one new line and the block is surrounded by matching lines.
   * - Otherwise, all mismatches are treated as ADDED / REMOVED separately.
   */
  computeDiff(
    oldLines: string[],
    newLines: string[]
  ): {
    added: DiffLine[];
    removed: DiffLine[];
    modified: DiffLine[];
  } {
    const lcs = this.computeLcs(oldLines, newLines);

    // Mark which indices belong to the LCS
    const oldInLcs = new Array(oldLines.length).fill(false);
    const newInLcs = new Array(newLines.length).fill(false);

    {
      let oi = 0, ni = 0, li = 0;
      while (li < lcs.length && oi < oldLines.length && ni < newLines.length) {
        if (oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
          oldInLcs[oi] = true;
          newInLcs[ni] = true;
          oi++; ni++; li++;
        } else if (oldLines[oi] !== lcs[li]) {
          oi++;
        } else {
          ni++;
        }
      }
    }

    const added: DiffLine[] = [];
    const removed: DiffLine[] = [];
    const modified: DiffLine[] = [];

    let i = 0;   // index into oldLines
    let j = 0;   // index into newLines

    while (i < oldLines.length || j < newLines.length) {
      // Both sides are on an LCS line → advance
      if (i < oldLines.length && j < newLines.length && oldInLcs[i] && newInLcs[j]) {
        i++;
        j++;
        continue;
      }

      // Start of a diff block – both sides will be moved past their non‑LCS lines
      const oldStart = i;
      const newStart = j;
      while (i < oldLines.length && !oldInLcs[i]) i++;
      while (j < newLines.length && !newInLcs[j]) j++;

      const oldCount = i - oldStart;
      const newCount = j - newStart;

      // Rule: a modification is only reported when:
      //   1) exactly one old and one new line,
      //   2) the block is not at the very beginning (oldStart > 0),
      //   3) the block is not at the very end (i < oldLen && j < newLen).
      if (
        oldCount === 1 &&
        newCount === 1 &&
        oldStart > 0 &&
        i < oldLines.length &&
        j < newLines.length
      ) {
        modified.push(
          new DiffLine(newStart + 1, newLines[newStart], DiffLineType.MODIFIED)
        );
      } else {
        // Treat all old lines as removals
        for (let k = 0; k < oldCount; k++) {
          removed.push(
            new DiffLine(oldStart + k + 1, oldLines[oldStart + k], DiffLineType.REMOVED)
          );
        }
        // Treat all new lines as additions
        for (let k = 0; k < newCount; k++) {
          added.push(
            new DiffLine(newStart + k + 1, newLines[newStart + k], DiffLineType.ADDED)
          );
        }
      }
    }

    return { added, removed, modified };
  }

  /**
   * Standard LCS via dynamic programming.
   */
  private computeLcs(oldLines: string[], newLines: string[]): string[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs.unshift(oldLines[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return lcs;
  }
}