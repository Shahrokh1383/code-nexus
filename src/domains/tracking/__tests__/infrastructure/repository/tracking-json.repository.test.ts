import { TrackingJsonRepository } from '../../../infrastructure/repository/tracking-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';

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

const hexHash = (char: string) => char.repeat(64);

const createFileHash = (opts: { id?: string; filePath?: string; hash?: string } = {}) => {
  return new FileHash(
    new FileHashId(opts.id ?? 'hash-id-1'),
    new FilePath(opts.filePath ?? 'src/index.ts'),
    new HashValue(opts.hash ?? hexHash('a'))
  );
};

const defaultIndex = {
  version: '1.0',
  hashes: {},
};

describe('TrackingJsonRepository', () => {
  let repo: TrackingJsonRepository;

  beforeEach(() => {
    repo = new TrackingJsonRepository('/fake/root');
  });

  describe('constructor', () => {
    it('should create JsonDatabase and SchemaMigrator with correct arguments', () => {
      expect(JsonDatabase).toHaveBeenCalledWith('/fake/root');
      expect(SchemaMigrator).toHaveBeenCalledWith('1.0');
    });
  });

  describe('readIndex (indirectly via public methods)', () => {
    it('should return default index when db.read throws ENOENT', async () => {
      const enoentError = new Error('File not found') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockRead.mockRejectedValue(enoentError);
      const result = await repo.findHashByPath(new FilePath('nonexistent'));
      expect(result).toBeNull();
    });

    it('should propagate non-ENOENT errors', async () => {
      mockRead.mockRejectedValue(new Error('Permission denied'));
      await expect(repo.findHashByPath(new FilePath('any'))).rejects.toThrow('Permission denied');
    });

    it('should apply schema migration when data is read', async () => {
      const rawData = { version: '1.0', hashes: {} };
      mockRead.mockResolvedValue(rawData);
      mockMigrate.mockReturnValue(rawData);

      await repo.findAllHashes();
      expect(mockMigrate).toHaveBeenCalledWith(rawData);
    });
  });

  describe('findHashByPath', () => {
    it('should return null if hash not found', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      mockMigrate.mockReturnValue(defaultIndex);
      const result = await repo.findHashByPath(new FilePath('not-there'));
      expect(result).toBeNull();
    });

    it('should return mapped FileHash if found', async () => {
      const filePath = 'src/app.ts';
      const hashId = 'hash-app';
      const hashValue = hexHash('b');
      const entry = {
        id: hashId,
        filePath,
        hashValue,
        committedAt: null,
        commitId: null,
      };
      const index = { version: '1.0', hashes: { [filePath]: entry } };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findHashByPath(new FilePath(filePath));

      expect(result).toBeInstanceOf(FileHash);
      expect(result!.id.value).toBe(hashId);
      expect(result!.filePath.value).toBe(filePath);
      expect(result!.hashValue.value).toBe(hashValue.toLowerCase());
      expect(result!.committedAt.isNone).toBe(true);
      expect(result!.commitId.isNone).toBe(true);
    });
  });

  describe('findAllHashes', () => {
    it('should return empty array for empty index', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      mockMigrate.mockReturnValue(defaultIndex);
      const result = await repo.findAllHashes();
      expect(result).toEqual([]);
    });

    it('should return array of all hashes', async () => {
      const hashA = hexHash('a');
      const hashB = hexHash('b');
      const index = {
        version: '1.0',
        hashes: {
          'a.ts': { id: '1', filePath: 'a.ts', hashValue: hashA, committedAt: null, commitId: null },
          'b.ts': { id: '2', filePath: 'b.ts', hashValue: hashB, committedAt: null, commitId: null },
        },
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findAllHashes();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(FileHash);
      expect(result[0].filePath.value).toBe('a.ts');
      expect(result[1].filePath.value).toBe('b.ts');
    });
  });

  describe('saveHash', () => {
    it('should add a new hash entry', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      mockMigrate.mockReturnValue(defaultIndex);
      const fileHash = createFileHash({ filePath: 'new.ts', hash: hexHash('c') });
      await repo.saveHash(fileHash);

      const written = mockWrite.mock.calls[0][1];
      expect(written.hashes['new.ts']).toBeDefined();
      expect(written.hashes['new.ts'].hashValue).toBe(hexHash('c').toLowerCase());
    });

    it('should overwrite existing hash entry for the same path', async () => {
      const existingPath = 'src/existing.ts';
      const oldHash = hexHash('0');
      const existingIndex = {
        version: '1.0',
        hashes: {
          [existingPath]: {
            id: 'old-id',
            filePath: existingPath,
            hashValue: oldHash,
            committedAt: '2024-01-01T00:00:00Z',
            commitId: 'old-commit',
          },
        },
      };
      mockRead.mockResolvedValue(existingIndex);
      mockMigrate.mockReturnValue(existingIndex);

      const newFileHash = createFileHash({ id: 'new-id', filePath: existingPath, hash: hexHash('f') });
      await repo.saveHash(newFileHash);

      const written = mockWrite.mock.calls[0][1];
      expect(written.hashes[existingPath].id).toBe('new-id');
      expect(written.hashes[existingPath].hashValue).toBe(hexHash('f').toLowerCase());
    });

    it('should preserve existing diff if not provided', async () => {
      const filePath = 'src/with-diff.ts';
      const existingDiff = { filePath, oldHash: hexHash('a'), newHash: hexHash('b'), addedLines: [], removedLines: [], modifiedLines: [] };
      const entry = {
        id: 'hash-1',
        filePath,
        hashValue: hexHash('a'),
        committedAt: null,
        commitId: null,
        diff: existingDiff,
      };
      const index = { version: '1.0', hashes: { [filePath]: entry } };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const fileHash = createFileHash({ id: 'hash-1', filePath, hash: hexHash('c') });
      await repo.saveHash(fileHash); // no diff argument

      const written = mockWrite.mock.calls[0][1];
      expect(written.hashes[filePath].diff).toEqual(existingDiff);
    });
  });

  describe('findDiffByPath', () => {
    it('should return null if not found', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      mockMigrate.mockReturnValue(defaultIndex);
      const result = await repo.findDiffByPath(new FilePath('nope'));
      expect(result).toBeNull();
    });

    it('should return diff dto if present', async () => {
      const filePath = 'src/with-diff.ts';
      const diff = { filePath, oldHash: hexHash('a'), newHash: hexHash('b'), addedLines: [], removedLines: [], modifiedLines: [] };
      const index = {
        version: '1.0',
        hashes: {
          [filePath]: { id: '1', filePath, hashValue: hexHash('a'), committedAt: null, commitId: null, diff },
        },
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findDiffByPath(new FilePath(filePath));
      expect(result).toEqual(diff);
    });
  });

  describe('deleteHashByPath', () => {
    it('should remove hash entry', async () => {
      const filePath = 'src/to-delete.ts';
      const index = {
        version: '1.0',
        hashes: {
          [filePath]: { id: '1', filePath, hashValue: hexHash('a'), committedAt: null, commitId: null },
          'keep.ts': { id: '2', filePath: 'keep.ts', hashValue: hexHash('b'), committedAt: null, commitId: null },
        },
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      await repo.deleteHashByPath(new FilePath(filePath));

      const written = mockWrite.mock.calls[0][1];
      expect(written.hashes[filePath]).toBeUndefined();
      expect(written.hashes['keep.ts']).toBeDefined();
    });
  });
});