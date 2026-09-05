import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { TrackedFilePath } from '../value-objects/tracked-file-path';
import { HashValue } from '../value-objects/hash-value';
import { DiffId } from '../value-objects/diff-id';

export class ChangesDetectedEvent extends DomainEvent {
  readonly filePath: TrackedFilePath;
  readonly oldHash: HashValue;
  readonly newHash: HashValue;
  readonly diffId: DiffId;

  constructor(filePath: TrackedFilePath, oldHash: HashValue, newHash: HashValue, diffId: DiffId) {
    super('ChangesDetectedEvent');
    this.filePath = filePath;
    this.oldHash = oldHash;
    this.newHash = newHash;
    this.diffId = diffId;
  }
}