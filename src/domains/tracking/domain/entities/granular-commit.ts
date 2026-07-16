import { CommitId } from '../value-objects/commit-id';
import { FileHash } from './file-hash';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';

export class GranularCommit {
  private readonly _id: CommitId;
  private readonly _fileHashes: FileHash[];
  private readonly _committedAt: DateTime;

  constructor(
    id: CommitId,
    fileHashes: FileHash[],
    committedAt: DateTime,
  ) {
    this._id = id;
    this._fileHashes = [...fileHashes];
    this._committedAt = committedAt;
  }

  get id(): CommitId { return this._id; }
  get fileHashes(): FileHash[] { return [...this._fileHashes]; }
  get committedAt(): DateTime { return this._committedAt; }

  getLinkedFiles(): FilePath[] {
    return this._fileHashes.map(fh => fh.filePath);
  }
}