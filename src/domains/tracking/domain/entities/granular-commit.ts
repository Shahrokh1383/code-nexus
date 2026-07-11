import { CommitId } from '../value-objects/commit-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileHash } from './file-hash';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitStatus } from '../value-objects/commit-status';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { InvalidStateException } from '../../../shared-kernel/exceptions/invalid-state-exception';

export class GranularCommit {
  private readonly _id: CommitId;
  private readonly _documentId: DocumentId;
  private readonly _fileHashes: FileHash[];
  private readonly _committedAt: DateTime;
  private _status: CommitStatus;

  constructor(
    id: CommitId,
    documentId: DocumentId,
    fileHashes: FileHash[],
    committedAt: DateTime,
    status: CommitStatus
  ) {
    this._id = id;
    this._documentId = documentId;
    this._fileHashes = [...fileHashes];
    this._committedAt = committedAt;
    this._status = status;
  }

  get id(): CommitId {
    return this._id;
  }

  get documentId(): DocumentId {
    return this._documentId;
  }

  get fileHashes(): FileHash[] {
    return [...this._fileHashes];
  }

  get committedAt(): DateTime {
    return this._committedAt;
  }

  get status(): CommitStatus {
    return this._status;
  }

  approve(): void {
    if (this._status.isApproved) {
      throw new InvalidStateException('Commit has already been approved', {
        commitId: this._id.toString(),
      });
    }
    this._status = CommitStatus.approved();
  }

  getLinkedFiles(): FilePath[] {
    return this._fileHashes.map((fh) => fh.filePath);
  }
}