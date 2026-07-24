import { FileNodeId } from '../value-objects/file-node-id';
import { FilePath } from '../value-objects/file-path';
import { FileHash } from '../value-objects/file-hash';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';

export class FileNode {
  constructor(
    private readonly _id: FileNodeId,
    private readonly _path: FilePath,
    private readonly _name: string,
    private readonly _parentPath: FilePath,
    private readonly _lastModified: DateTime,
    private readonly _hash: Maybe<FileHash>,
    private readonly _isDirectory: boolean
  ) {
    const expectedParent = _path.getParentPath();
    if (!expectedParent.equals(_parentPath)) {
      throw new DomainException(
        'FILE_NODE_INVALID_PARENT',
        'Parent path does not match the file path',
        { path: _path.value, parentPath: _parentPath.value }
      );
    }
  }

  get id(): FileNodeId { return this._id; }
  get path(): FilePath { return this._path; }
  get name(): string { return this._name; }
  get parentPath(): FilePath { return this._parentPath; }
  get lastModified(): DateTime { return this._lastModified; }
  get hash(): Maybe<FileHash> { return this._hash; }
  get isDirectory(): boolean { return this._isDirectory; }
}