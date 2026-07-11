import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../value-objects/hash-value';
import { DiffId } from '../value-objects/diff-id';

export class ChangesDetectedEvent extends DomainEvent {
  readonly filePath: FilePath;
  readonly oldHash: HashValue;
  readonly newHash: HashValue;
  readonly diffId: DiffId;

  constructor(filePath: FilePath, oldHash: HashValue, newHash: HashValue, diffId: DiffId) {
    super('ChangesDetectedEvent');
    this.filePath = filePath;
    this.oldHash = oldHash;
    this.newHash = newHash;
    this.diffId = diffId;
  }
}