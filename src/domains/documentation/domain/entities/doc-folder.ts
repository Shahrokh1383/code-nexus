import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { DocFolderId } from '../value-objects/doc-folder-id';
import { DocFolderSignature } from '../value-objects/doc-folder-signature';

export class DocFolder {
  private _path: string;
  private _signature: DocFolderSignature;
  private _documentCount: number;

  constructor(
    private readonly _id: DocFolderId,
    path: string,
    signature: DocFolderSignature,
    documentCount: number = 0
  ) {
    if (!path || path.trim().length === 0) {
      throw new Error('Doc folder path cannot be empty');
    }
    if (documentCount < 0) {
      throw new Error('Document count cannot be negative');
    }
    this._path = PathUtils.normalize(path);
    this._signature = signature;
    this._documentCount = documentCount;
  }

  get id(): DocFolderId {
    return this._id;
  }

  get path(): string {
    return this._path;
  }

  get signature(): DocFolderSignature {
    return this._signature;
  }

  get documentCount(): number {
    return this._documentCount;
  }

  updateSignature(signature: DocFolderSignature): void {
    this._signature = signature;
  }

  relocate(newPath: string): void {
    const normalized = PathUtils.normalize(newPath);
    if (!normalized || normalized.length === 0) {
      throw new Error('Doc folder path cannot be empty');
    }
    this._path = normalized;
  }

  updateDocumentCount(count: number): void {
    if (count < 0) {
      throw new Error('Document count cannot be negative');
    }
    this._documentCount = count;
  }
}