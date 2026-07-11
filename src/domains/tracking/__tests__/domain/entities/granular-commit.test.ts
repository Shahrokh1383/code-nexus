import { GranularCommit } from '../../../domain/entities/granular-commit';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../../domain/value-objects/commit-status';
import { InvalidStateException } from '../../../../shared-kernel/exceptions/invalid-state-exception';

describe('GranularCommit', () => {
  const createFileHash = (path: string) => {
    return new FileHash(
      new FileHashId('fh-' + path),
      new FilePath(path),
      new HashValue('a'.repeat(64))
    );
  };

  const createCommit = (status: CommitStatus = CommitStatus.pending()) => {
    return new GranularCommit(
      new CommitId('commit-1'),
      new DocumentId('doc-1'),
      [createFileHash('src/a.ts'), createFileHash('src/b.ts')],
      DateTime.now(),
      status
    );
  };

  it('should create with pending status', () => {
    const commit = createCommit();
    expect(commit.status.isPending).toBe(true);
    expect(commit.id.value).toBe('commit-1');
    expect(commit.documentId.value).toBe('doc-1');
  });

  it('should return linked file paths', () => {
    const commit = createCommit();
    const paths = commit.getLinkedFiles();
    expect(paths.length).toBe(2);
    expect(paths[0].value).toBe('src/a.ts');
    expect(paths[1].value).toBe('src/b.ts');
  });

  it('should approve pending commit', () => {
    const commit = createCommit();
    commit.approve();
    expect(commit.status.isApproved).toBe(true);
  });

  it('should throw when approving already approved commit', () => {
    const commit = createCommit(CommitStatus.approved());
    expect(() => commit.approve()).toThrow(InvalidStateException);
    expect(() => commit.approve()).toThrow('Commit has already been approved');
  });

  it('should return immutable copy of fileHashes', () => {
    const commit = createCommit();
    const hashes = commit.fileHashes;
    hashes.push(createFileHash('src/c.ts'));
    expect(commit.fileHashes.length).toBe(2);
  });

  it('should preserve committedAt', () => {
    const now = DateTime.now();
    const commit = new GranularCommit(
      new CommitId('commit-1'),
      new DocumentId('doc-1'),
      [],
      now,
      CommitStatus.pending()
    );
    expect(commit.committedAt.equals(now)).toBe(true);
  });
});