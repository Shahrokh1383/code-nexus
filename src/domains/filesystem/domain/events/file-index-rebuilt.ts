import { DomainEvent } from '../../../shared-kernel/events/domain-event';

export class FileIndexRebuiltEvent extends DomainEvent {
  readonly filePaths: Set<string>;

  constructor(filePaths: Set<string>) {
    super('FileIndexRebuilt');
    this.filePaths = filePaths;
  }
}