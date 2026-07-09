import { DomainEvent } from '../../../shared-kernel/events/domain-event';
import { FileNodeId } from '../value-objects/file-node-id';
import { FolderNodeId } from '../value-objects/folder-node-id';
import { FilePath } from '../value-objects/file-path';

export class FileDiscoveredEvent extends DomainEvent {
  readonly fileNodeId: FileNodeId | FolderNodeId;
  readonly path: FilePath;
  readonly isDirectory: boolean;

  constructor(fileNodeId: FileNodeId | FolderNodeId, path: FilePath, isDirectory: boolean) {
    super('FileDiscovered');
    this.fileNodeId = fileNodeId;
    this.path = path;
    this.isDirectory = isDirectory;
  }
}