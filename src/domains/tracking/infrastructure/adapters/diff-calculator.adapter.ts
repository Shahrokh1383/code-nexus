import { DiffLine, DiffLineType } from '../../domain/value-objects/diff-line';

/**
 * Infrastructure adapter that implements the line-level diff algorithm.
 * Used by DiffCalculatorService (Domain) to compute added, removed, and modified lines.
 */
export class DiffCalculatorAdapter {
  computeDiff(
    oldLines: string[],
    newLines: string[]
  ): {
    added: DiffLine[];
    removed: DiffLine[];
    modified: DiffLine[];
  } {
    const added: DiffLine[] = [];
    const removed: DiffLine[] = [];
    const modified: DiffLine[] = [];

    let i = 0;
    let j = 0;
    const LOOKAHEAD = 3;

    while (i < oldLines.length || j < newLines.length) {
      if (
        i < oldLines.length &&
        j < newLines.length &&
        oldLines[i] === newLines[j]
      ) {
        i++;
        j++;
        continue;
      }

      let foundInNew = -1;
      for (let k = j; k < Math.min(j + LOOKAHEAD, newLines.length); k++) {
        if (oldLines[i] === newLines[k]) {
          foundInNew = k;
          break;
        }
      }

      let foundInOld = -1;
      for (let k = i; k < Math.min(i + LOOKAHEAD, oldLines.length); k++) {
        if (newLines[j] === oldLines[k]) {
          foundInOld = k;
          break;
        }
      }

      if (
        foundInNew !== -1 &&
        (foundInOld === -1 || foundInNew - j <= foundInOld - i)
      ) {
        for (let k = j; k < foundInNew; k++) {
          added.push(new DiffLine(k + 1, newLines[k], DiffLineType.ADDED));
        }
        j = foundInNew;
      } else if (foundInOld !== -1) {
        for (let k = i; k < foundInOld; k++) {
          removed.push(new DiffLine(k + 1, oldLines[k], DiffLineType.REMOVED));
        }
        i = foundInOld;
      } else {
        if (i < oldLines.length && j < newLines.length) {
          modified.push(new DiffLine(j + 1, newLines[j], DiffLineType.MODIFIED));
          i++;
          j++;
        } else if (i < oldLines.length) {
          removed.push(new DiffLine(i + 1, oldLines[i], DiffLineType.REMOVED));
          i++;
        } else {
          added.push(new DiffLine(j + 1, newLines[j], DiffLineType.ADDED));
          j++;
        }
      }
    }

    return { added, removed, modified };
  }
}