import { DiffId } from '../value-objects/diff-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../value-objects/hash-value';
import { DiffLine } from '../value-objects/diff-line';

export class ContentDiff {
  private readonly _id: DiffId;
  private readonly _filePath: FilePath;
  private readonly _oldHash: HashValue;
  private readonly _newHash: HashValue;
  private readonly _addedLines: DiffLine[];
  private readonly _removedLines: DiffLine[];
  private readonly _modifiedLines: DiffLine[];

  constructor(
    id: DiffId,
    filePath: FilePath,
    oldHash: HashValue,
    newHash: HashValue,
    addedLines: DiffLine[],
    removedLines: DiffLine[],
    modifiedLines: DiffLine[]
  ) {
    this._id = id;
    this._filePath = filePath;
    this._oldHash = oldHash;
    this._newHash = newHash;
    this._addedLines = [...addedLines];
    this._removedLines = [...removedLines];
    this._modifiedLines = [...modifiedLines];
  }

  get id(): DiffId {
    return this._id;
  }

  get filePath(): FilePath {
    return this._filePath;
  }

  get oldHash(): HashValue {
    return this._oldHash;
  }

  get newHash(): HashValue {
    return this._newHash;
  }

  get addedLines(): DiffLine[] {
    return [...this._addedLines];
  }

  get removedLines(): DiffLine[] {
    return [...this._removedLines];
  }

  get modifiedLines(): DiffLine[] {
    return [...this._modifiedLines];
  }

  isEmpty(): boolean {
    return (
      this._addedLines.length === 0 &&
      this._removedLines.length === 0 &&
      this._modifiedLines.length === 0
    );
  }
}