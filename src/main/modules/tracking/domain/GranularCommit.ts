import { FileHash } from './FileHash';

export class CommitId {
  constructor(public readonly value: string) {}
}

export class GranularCommit {
  constructor(
    public readonly id: CommitId,
    public readonly fileHashes: readonly FileHash[],
    public readonly committedAt: Date,
  ) {}

  getLinkedFiles(): { value: string }[] {
    return this.fileHashes.map((fh) => fh.filePath);
  }
}