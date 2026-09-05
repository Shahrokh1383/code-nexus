import { TrackedFilePath } from '../value-objects/tracked-file-path';
import { HashValue } from '../value-objects/hash-value';
import { DiffId } from '../value-objects/diff-id';
import { ContentDiff } from '../entities/content-diff';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { IDiffCalculator } from '../../application/ports/diff-calculator.interface';

export class DiffCalculatorService {
  constructor(private readonly diffCalculator: IDiffCalculator) {}

  calculate(
    oldContent: string,
    newContent: string,
    filePath: TrackedFilePath,
    oldHash: HashValue,
    newHash: HashValue
  ): ContentDiff {
    const oldLines = oldContent === '' ? [] : oldContent.split('\n');
    const newLines = newContent === '' ? [] : newContent.split('\n');

    const { added, removed, modified } = this.diffCalculator.computeDiff(oldLines, newLines);

    return new ContentDiff(
        new DiffId(UuidGenerator.generate()),
        filePath,
        oldHash,
        newHash,
        added,
        removed,
        modified
    );
  }
}