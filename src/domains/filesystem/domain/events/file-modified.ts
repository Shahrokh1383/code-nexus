import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { FileNodeId } from '../value-objects/file-node-id';
import { FilePath } from '../value-objects/file-path';
import { FileHash } from '../value-objects/file-hash';

export class FileModifiedEvent extends DomainEvent {
  readonly fileNodeId: FileNodeId;
  readonly path: FilePath;
  readonly newHash: FileHash;

  constructor(fileNodeId: FileNodeId, path: FilePath, newHash: FileHash) {
    super('FileModified');
    this.fileNodeId = fileNodeId;
    this.path = path;
    this.newHash = newHash;
  }
}