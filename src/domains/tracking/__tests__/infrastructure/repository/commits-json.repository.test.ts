import { CommitsJsonRepository } from '../../../infrastructure/repository/commits-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';
import { GranularCommit } from '../../../domain/entities/granular-commit';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DateTime } from '../../../../shared-kernel/types/date-time';

jest.mock('../../../../../infrastructure/persistence/json-database');
jest.mock('../../../../../infrastructure/persistence/migration/schema-migrator');

const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockMigrate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (JsonDatabase as jest.Mock).mockImplementation(() => ({
    read: mockRead,
    write: mockWrite,
  }));
  (SchemaMigrator as jest.Mock).mockImplementation(() => ({
    migrate: mockMigrate,
  }));
});

const createCommit = (id: string, filePaths: string[], hashChars: string[]) =>
  new GranularCommit(
    new CommitId(id),
    filePaths.map((p, i) => new FileHash(new FileHashId(`fh-${p}`), new FilePath(p), new HashValue(hashChars[i].repeat(64)))),
    DateTime.fromISO('2024-01-01T00:00:00.000Z'),
  );

const emptyIndex = { version: '1.1', commits: [] };

describe('CommitsJsonRepository', () => {
  let repo: CommitsJsonRepository;

  beforeEach(() => {
    repo = new CommitsJsonRepository('/fake/root');
  });

  describe('findById', () => {
    it('should return null when not found', async () => {
      mockRead.mockResolvedValue(emptyIndex);
      mockMigrate.mockReturnValue(emptyIndex);
      const result = await repo.findById(new CommitId('missing'));
      expect(result).toBeNull();
    });

    it('should return mapped GranularCommit when found', async () => {
      const index = {
        version: '1.1',
        commits: [
          {
            id: 'commit-1',
            fileHashes: [
              { id: 'fh-a.ts', filePath: 'a.ts', hashValue: 'a'.repeat(64) },
            ],
            committedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);
      const result = await repo.findById(new CommitId('commit-1'));
      expect(result).toBeInstanceOf(GranularCommit);
      expect(result!.id.value).toBe('commit-1');
      expect(result!.fileHashes).toHaveLength(1);
      expect(result!.fileHashes[0].filePath.value).toBe('a.ts');
    });
  });

  describe('findAll', () => {
    it('should return empty array for empty index', async () => {
      mockRead.mockResolvedValue(emptyIndex);
      mockMigrate.mockReturnValue(emptyIndex);
      expect(await repo.findAll()).toEqual([]);
    });

    it('should return all commits', async () => {
      const index = {
        version: '1.1',
        commits: [
          { id: 'c1', fileHashes: [], committedAt: '2024-01-01T00:00:00.000Z' },
          { id: 'c2', fileHashes: [], committedAt: '2024-02-01T00:00:00.000Z' },
        ],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);
      const result = await repo.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('save', () => {
    it('should add a new commit', async () => {
      mockRead.mockResolvedValue(emptyIndex);
      mockMigrate.mockReturnValue(emptyIndex);
      const commit = createCommit('new', ['a.ts'], ['a']);
      await repo.save(commit);
      const written = mockWrite.mock.calls[0][1];
      expect(written.commits).toHaveLength(1);
      expect(written.commits[0].id).toBe('new');
    });

    it('should update existing commit', async () => {
      const existing = {
        version: '1.1',
        commits: [
          { id: 'existing', fileHashes: [], committedAt: '2024-01-01T00:00:00.000Z' },
        ],
      };
      mockRead.mockResolvedValue(existing);
      mockMigrate.mockReturnValue(existing);
      const updated = createCommit('existing', ['b.ts'], ['b']);
      await repo.save(updated);
      const written = mockWrite.mock.calls[0][1];
      expect(written.commits).toHaveLength(1);
      expect(written.commits[0].fileHashes).toHaveLength(1);
    });
  });

  it('should handle ENOENT gracefully by returning empty index', async () => {
    const err = new Error('no file') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockRead.mockRejectedValue(err);
    const result = await repo.findAll();
    expect(result).toEqual([]);
  });
});