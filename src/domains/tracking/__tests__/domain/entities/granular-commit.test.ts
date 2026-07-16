import { GranularCommit } from '../../../domain/entities/granular-commit';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('GranularCommit', () => {
  const createFileHash = (path: string) => {
    return new FileHash(
      new FileHashId('fh-' + path),
      new FilePath(path),
      new HashValue('a'.repeat(64))
    );
  };

  // Strictly matches the 3-argument constructor
  const createCommit = (fileHashes: FileHash[] = []) => {
    return new GranularCommit(
      new CommitId('commit-1'),
      fileHashes,
      DateTime.now()
    );
  };

  it('should create with required properties', () => {
    const commit = createCommit([createFileHash('src/a.ts')]);
    expect(commit.id.value).toBe('commit-1');
    expect(commit.fileHashes).toHaveLength(1);
    expect(commit.committedAt).toBeDefined();
  });

  it('should return linked file paths', () => {
    const commit = createCommit([
      createFileHash('src/a.ts'), 
      createFileHash('src/b.ts')
    ]);
    const paths = commit.getLinkedFiles();
    expect(paths.length).toBe(2);
    expect(paths[0].value).toBe('src/a.ts');
    expect(paths[1].value).toBe('src/b.ts');
  });

  it('should return immutable copy of fileHashes', () => {
    const commit = createCommit([createFileHash('src/a.ts'), createFileHash('src/b.ts')]);
    const hashes = commit.fileHashes;
    
    // Attempt to mutate the returned array
    hashes.push(createFileHash('src/c.ts'));
    
    // Verify internal state remains strictly protected (SRP/Immutability)
    expect(commit.fileHashes.length).toBe(2);
  });

  it('should preserve committedAt', () => {
    const now = DateTime.now();
    const commit = new GranularCommit(
      new CommitId('commit-1'),
      [],
      now
    );
    expect(commit.committedAt.equals(now)).toBe(true);
  });
});