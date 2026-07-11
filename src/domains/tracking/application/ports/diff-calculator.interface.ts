import { DiffLine } from '../../domain/value-objects/diff-line';

export interface IDiffCalculator {
  computeDiff(
    oldLines: string[],
    newLines: string[]
  ): {
    added: DiffLine[];
    removed: DiffLine[];
    modified: DiffLine[];
  };
}