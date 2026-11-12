import { DiffLine, DiffLineType } from '../domain/ContentDiff';

export class DiffCalculator {
  computeDiff(
    oldLines: string[],
    newLines: string[],
  ): { added: DiffLine[]; removed: DiffLine[]; modified: DiffLine[] } {
    const lcs = this.computeLcs(oldLines, newLines);

    const oldInLcs = new Array<boolean>(oldLines.length).fill(false);
    const newInLcs = new Array<boolean>(newLines.length).fill(false);

    {
      let oi = 0, ni = 0, li = 0;
      while (li < lcs.length && oi < oldLines.length && ni < newLines.length) {
        if (oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
          oldInLcs[oi] = true;
          newInLcs[ni] = true;
          oi++; ni++; li++;
        } else if (oldLines[oi] !== lcs[li]) oi++;
        else ni++;
      }
    }

    const added: DiffLine[] = [];
    const removed: DiffLine[] = [];
    const modified: DiffLine[] = [];

    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldInLcs[i] && newInLcs[j]) {
        i++; j++; continue;
      }
      const oldStart = i;
      const newStart = j;
      while (i < oldLines.length && !oldInLcs[i]) i++;
      while (j < newLines.length && !newInLcs[j]) j++;
      const oldCount = i - oldStart;
      const newCount = j - newStart;

      if (
        oldCount === 1 &&
        newCount === 1 &&
        oldStart > 0 &&
        i < oldLines.length &&
        j < newLines.length
      ) {
        modified.push(new DiffLine(newStart + 1, newLines[newStart], DiffLineType.MODIFIED));
      } else {
        for (let k = 0; k < oldCount; k++) {
          removed.push(new DiffLine(oldStart + k + 1, oldLines[oldStart + k], DiffLineType.REMOVED));
        }
        for (let k = 0; k < newCount; k++) {
          added.push(new DiffLine(newStart + k + 1, newLines[newStart + k], DiffLineType.ADDED));
        }
      }
    }
    return { added, removed, modified };
  }

  private computeLcs(oldLines: string[], newLines: string[]): string[] {
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array<number>(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (oldLines[i - 1] === newLines[j - 1]) { lcs.unshift(oldLines[i - 1]); i--; j--; }
      else if (dp[i - 1][j] > dp[i][j - 1]) i--;
      else j--;
    }
    return lcs;
  }
}