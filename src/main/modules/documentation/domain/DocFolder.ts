import { PathUtils } from '../../../shared/utils/path-utils';
import { DocFolderSignature } from './DocFolderSignature';

/**
 * Registered documentation folder aggregate. The path is workspace-relative
 * and normalized on construction and relocation (legacy invariants verbatim).
 */
export class DocFolder {
  private _path: string;
  private _signature: DocFolderSignature;
  private _documentCount: number;

  constructor(
    private readonly _id: string,
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

  get id(): string { return this._id; }
  get path(): string { return this._path; }
  get signature(): DocFolderSignature { return this._signature; }
  get documentCount(): number { return this._documentCount; }

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