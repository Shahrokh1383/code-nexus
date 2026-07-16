import { FileHashId } from '../value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../value-objects/hash-value';

export class FileHash {
  private readonly _id: FileHashId;
  private readonly _filePath: FilePath;
  private _hashValue: HashValue;

  constructor(
    id: FileHashId,
    filePath: FilePath,
    hashValue: HashValue,
  ) {
    this._id = id;
    this._filePath = filePath;
    this._hashValue = hashValue;
  }

  get id(): FileHashId { return this._id; }
  get filePath(): FilePath { return this._filePath; }
  get hashValue(): HashValue { return this._hashValue; }

  updateHash(newHash: HashValue): void {
    this._hashValue = newHash;
  }
}