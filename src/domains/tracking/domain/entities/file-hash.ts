import { FileHashId } from '../value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../value-objects/hash-value';
import { Maybe } from '../../../shared-kernel/types/maybe';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitId } from '../value-objects/commit-id';

export class FileHash {
  private readonly _id: FileHashId;
  private readonly _filePath: FilePath;
  private _hashValue: HashValue;
  private _committedHashValue: Maybe<HashValue>;
  private _committedAt: Maybe<DateTime>;
  private _commitId: Maybe<CommitId>;

  constructor(
    id: FileHashId,
    filePath: FilePath,
    hashValue: HashValue,
    committedHashValue?: HashValue,
    committedAt?: DateTime,
    commitId?: CommitId
  ) {
    this._id = id;
    this._filePath = filePath;
    this._hashValue = hashValue;
    this._committedHashValue = committedHashValue ? Maybe.some(committedHashValue) : Maybe.none();
    this._committedAt = committedAt ? Maybe.some(committedAt) : Maybe.none();
    this._commitId = commitId ? Maybe.some(commitId) : Maybe.none();
  }

  get id(): FileHashId { return this._id; }
  get filePath(): FilePath { return this._filePath; }
  get hashValue(): HashValue { return this._hashValue; }
  get committedHashValue(): Maybe<HashValue> { return this._committedHashValue; }
  get committedAt(): Maybe<DateTime> { return this._committedAt; }
  get commitId(): Maybe<CommitId> { return this._commitId; }

  updateHash(newHash: HashValue): void {
    this._hashValue = newHash;
    this._commitId = Maybe.none();
    this._committedAt = Maybe.none();
  }

  commit(commitId: CommitId): void {
    this._commitId = Maybe.some(commitId);
    this._committedAt = Maybe.some(DateTime.now());
    this._committedHashValue = Maybe.some(this._hashValue);
  }

  revertToCommitted(): void {
    if (this._committedHashValue.isSome && this._commitId.isSome) {
      this._hashValue = this._committedHashValue.getOrNull()!;
    }
  }
}