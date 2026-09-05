import { HashValue } from '../value-objects/hash-value';
import { TrackedFilePath } from '../value-objects/tracked-file-path';
import { ChangesDetectedEvent } from '../events/changes-detected';
import { DiffId } from '../value-objects/diff-id';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class HashComparisonService {
  hasChanged(oldHash: HashValue, newHash: HashValue): boolean {
    return !oldHash.equals(newHash);
  }

  detectChanges(
    oldHash: HashValue,
    newHash: HashValue,
    filePath: TrackedFilePath
  ): ChangesDetectedEvent | null {
    if (!this.hasChanged(oldHash, newHash)) {
      return null;
    }

    return new ChangesDetectedEvent(
      filePath,
      oldHash,
      newHash,
      new DiffId(UuidGenerator.generate())
    );
  }
}