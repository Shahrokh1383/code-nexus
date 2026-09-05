import { FileHashId } from '../value-objects/file-hash-id';
import { TrackedFilePath } from '../value-objects/tracked-file-path';
import { HashValue } from '../value-objects/hash-value';

export class FileHash {
  private readonly _id: FileHashId;
  private readonly _filePath: TrackedFilePath;
  private _hashValue: HashValue;
  private _isPending: boolean;

  constructor(
    id: FileHashId,
    filePath: TrackedFilePath,
    hashValue: HashValue,
    isPending: boolean = false
  ) {
    this._id = id;
    this._filePath = filePath;
    this._hashValue = hashValue;
    this._isPending = isPending;
  }

  get id(): FileHashId { return this._id; }
  get filePath(): TrackedFilePath { return this._filePath; }
  get hashValue(): HashValue { return this._hashValue; }
  get isPending(): boolean { return this._isPending; }

  updateHash(newHash: HashValue): void {
    this._hashValue = newHash;
  }
}