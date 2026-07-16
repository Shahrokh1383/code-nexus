import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';

export class HashRevertedEvent extends DomainEvent {
  readonly filePath: FilePath;

  constructor(filePath: FilePath) {
    super('HashRevertedEvent');
    this.filePath = filePath;
  }
}