import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { FileNodeId } from '../value-objects/file-node-id';
import { FolderNodeId } from '../value-objects/folder-node-id';
import { FilePath } from '../value-objects/file-path';

export class FileMovedEvent extends DomainEvent {
  readonly fileNodeId: FileNodeId | FolderNodeId;
  readonly oldPath: FilePath;
  readonly newPath: FilePath;

  constructor(fileNodeId: FileNodeId | FolderNodeId, oldPath: FilePath, newPath: FilePath) {
    super('FileMoved');
    this.fileNodeId = fileNodeId;
    this.oldPath = oldPath;
    this.newPath = newPath;
  }
}