import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { DocFolderSignature } from '../value-objects/doc-folder-signature';

export class DocsFolderRelocatedEvent extends DomainEvent {
  constructor(
    readonly oldPath: string,
    readonly newPath: string,
    readonly signature: DocFolderSignature
  ) {
    super('DocsFolderRelocatedEvent');
  }
}