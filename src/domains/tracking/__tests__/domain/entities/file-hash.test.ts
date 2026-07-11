import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('FileHash', () => {
  const createFileHash = (committedAt?: DateTime, commitId?: CommitId) => {
    return new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64)),
      committedAt,
      commitId
    );
  };

  it('should create with all properties', () => {
    const fileHash = createFileHash();
    expect(fileHash.id.value).toBe('fh-1');
    expect(fileHash.filePath.value).toBe('src/app.ts');
    expect(fileHash.hashValue.value).toBe('a'.repeat(64));
    expect(fileHash.committedAt.isNone).toBe(true);
    expect(fileHash.commitId.isNone).toBe(true);
  });

  it('should create with committedAt and commitId', () => {
    const now = DateTime.now();
    const commitId = new CommitId('commit-1');
    const fileHash = createFileHash(now, commitId);

    expect(fileHash.committedAt.isSome).toBe(true);
    expect(fileHash.committedAt.getOrNull()?.toISO()).toBe(now.toISO());
    expect(fileHash.commitId.isSome).toBe(true);
    expect(fileHash.commitId.getOrNull()?.value).toBe('commit-1');
  });

  it('should update hash', () => {
    const fileHash = createFileHash();
    const newHash = new HashValue('b'.repeat(64));
    fileHash.updateHash(newHash);
    expect(fileHash.hashValue.equals(newHash)).toBe(true);
  });

  it('should commit and set commitId and committedAt', () => {
    const fileHash = createFileHash();
    const commitId = new CommitId('commit-1');
    fileHash.commit(commitId);

    expect(fileHash.commitId.isSome).toBe(true);
    expect(fileHash.commitId.getOrNull()?.value).toBe('commit-1');
    expect(fileHash.committedAt.isSome).toBe(true);
    expect(fileHash.committedAt.getOrNull()).toBeInstanceOf(DateTime);
  });

  it('should override previous commit on re-commit', () => {
    const fileHash = createFileHash(DateTime.now(), new CommitId('commit-1'));
    const newCommitId = new CommitId('commit-2');
    fileHash.commit(newCommitId);

    expect(fileHash.commitId.getOrNull()?.value).toBe('commit-2');
  });
});