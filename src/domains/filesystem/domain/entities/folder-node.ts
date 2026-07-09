import { FolderNodeId } from '../value-objects/folder-node-id';
import { FilePath } from '../value-objects/file-path';
import { FileNode } from './file-node';
import { Identifier } from '../../../shared-kernel/types/identifier';
import { DomainException } from '../../../shared-kernel/exceptions/domain-exception';

export class FolderNode {
  private readonly _children: Array<FileNode | FolderNode> = [];

  constructor(
    private readonly _id: FolderNodeId,
    private readonly _path: FilePath,
    private readonly _name: string
  ) {}

  get id(): FolderNodeId {
    return this._id;
  }

  get path(): FilePath {
    return this._path;
  }

  get name(): string {
    return this._name;
  }

  get children(): ReadonlyArray<FileNode | FolderNode> {
    return this._children;
  }

  addChild(node: FileNode | FolderNode): void {
    const childParent = node.path.getParentPath();
    if (!childParent.equals(this._path)) {
      throw new DomainException(
        'FOLDER_NODE_INVALID_CHILD',
        'Child node path does not belong to this folder',
        { folderPath: this._path.value, childPath: node.path.value }
      );
    }

    if (this._children.some(c => c.id.equals(node.id))) {
      throw new DomainException(
        'FOLDER_NODE_DUPLICATE_CHILD',
        'Child with the same ID already exists',
        { folderPath: this._path.value, childId: node.id.value }
      );
    }

    this._children.push(node);
  }

  removeChild(id: Identifier): void {
    const index = this._children.findIndex(c => c.id.equals(id));
    if (index === -1) {
      throw new DomainException(
        'FOLDER_NODE_CHILD_NOT_FOUND',
        'Child not found in folder',
        { folderPath: this._path.value, childId: id.value }
      );
    }
    this._children.splice(index, 1);
  }

  getAllDescendants(): FileNode[] {
    const descendants: FileNode[] = [];

    for (const child of this._children) {
      if (child instanceof FileNode) {
        descendants.push(child);
      } else if (child instanceof FolderNode) {
        descendants.push(...child.getAllDescendants());
      }
    }

    return descendants;
  }
}