import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { FileNodeId } from '../value-objects/file-node-id';
import { FolderNodeId } from '../value-objects/folder-node-id';
import { FilePath } from '../value-objects/file-path';

export class FileExcludedEvent extends DomainEvent {
  readonly fileNodeId?: FileNodeId | FolderNodeId;
  readonly path: FilePath;

  constructor(fileNodeId: FileNodeId | FolderNodeId | undefined, path: FilePath) {
    super('FileExcluded');
    this.fileNodeId = fileNodeId;
    this.path = path;
  }
}