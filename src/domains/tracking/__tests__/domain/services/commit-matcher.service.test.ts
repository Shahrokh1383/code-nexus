import { CommitMatcherService } from '../../../domain/services/commit-matcher.service';
import { ICommitRepository } from '../../../domain/repository/commit-repository.interface';
import { GranularCommit } from '../../../domain/entities/granular-commit';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('CommitMatcherService', () => {
  let service: CommitMatcherService;
  let mockCommitRepo: jest.Mocked<ICommitRepository>;

  beforeEach(() => {
    service = new CommitMatcherService();
    mockCommitRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
    } as any;
  });

  const createHash = (path: string, char: string) =>
    new FileHash(new FileHashId(`fh-${path}`), new FilePath(path), new HashValue(char.repeat(64)));

  const createCommit = (id: string, ...hashes: FileHash[]) =>
    new GranularCommit(new CommitId(id), hashes, DateTime.now());

  it('should return null when no commits exist', async () => {
    mockCommitRepo.findAll.mockResolvedValue([]);
    const current = new Map([['a.ts', new HashValue('a'.repeat(64))]]);
    const result = await service.findMatchingCommit(current, mockCommitRepo);
    expect(result).toBeNull();
  });

  it('should return null when no commit matches current state', async () => {
    const commit = createCommit('c1', createHash('a.ts', 'a'));
    mockCommitRepo.findAll.mockResolvedValue([commit]);
    const current = new Map([['a.ts', new HashValue('b'.repeat(64))]]);
    expect(await service.findMatchingCommit(current, mockCommitRepo)).toBeNull();
  });

  it('should return the matching commit when hashes are identical', async () => {
    const commit = createCommit('c1', createHash('a.ts', 'a'), createHash('b.ts', 'b'));
    mockCommitRepo.findAll.mockResolvedValue([commit]);
    const current = new Map([
      ['a.ts', new HashValue('a'.repeat(64))],
      ['b.ts', new HashValue('b'.repeat(64))],
    ]);
    const result = await service.findMatchingCommit(current, mockCommitRepo);
    expect(result).toBe(commit);
  });

  it('should skip commits with different file count', async () => {
    const commit = createCommit('c1', createHash('a.ts', 'a'));
    mockCommitRepo.findAll.mockResolvedValue([commit]);
    const current = new Map([
      ['a.ts', new HashValue('a'.repeat(64))],
      ['b.ts', new HashValue('b'.repeat(64))],
    ]);
    expect(await service.findMatchingCommit(current, mockCommitRepo)).toBeNull();
  });

  it('should return first matching commit when multiple exist', async () => {
    const commit1 = createCommit('c1', createHash('a.ts', 'a'));
    const commit2 = createCommit('c2', createHash('a.ts', 'a'));
    mockCommitRepo.findAll.mockResolvedValue([commit1, commit2]);
    const current = new Map([['a.ts', new HashValue('a'.repeat(64))]]);
    const result = await service.findMatchingCommit(current, mockCommitRepo);
    expect(result).toBe(commit1);
  });
});