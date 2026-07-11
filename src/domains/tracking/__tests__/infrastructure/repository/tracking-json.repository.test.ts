import { TrackingJsonRepository } from '../../../infrastructure/repository/tracking-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';
import { FileHash } from '../../../domain/entities/file-hash';
import { GranularCommit } from '../../../domain/entities/granular-commit';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../../domain/value-objects/commit-status';

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

// Helper: generate a valid 64‑char SHA‑256 hex string using a single hex digit
const hexHash = (char: string) => char.repeat(64);

// Helper to create a real FileHash entity with a valid hash
const createFileHash = (opts: { id?: string; filePath?: string; hash?: string } = {}) => {
  return new FileHash(
    new FileHashId(opts.id ?? 'hash-id-1'),
    new FilePath(opts.filePath ?? 'src/index.ts'),
    new HashValue(opts.hash ?? hexHash('a')) // default valid hash
  );
};

// Helper to create a real GranularCommit
const createCommit = (opts: {
  id?: string;
  documentId?: string;
  fileHashes?: FileHash[];
  committedAt?: DateTime;
  approved?: boolean;
} = {}) => {
  return new GranularCommit(
    new CommitId(opts.id ?? 'commit-1'),
    new DocumentId(opts.documentId ?? 'doc-1'),
    opts.fileHashes ?? [createFileHash()],
    opts.committedAt ?? DateTime.fromISO('2025-01-01T00:00:00Z'),
    opts.approved ? CommitStatus.approved() : CommitStatus.pending()
  );
};

const defaultIndex = {
  version: '1.0',
  hashes: {},
  commits: [],
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
    it('should return default index when db.read throws', async () => {
      mockRead.mockRejectedValue(new Error('File not found'));
      const result = await repo.findHashByPath(new FilePath('nonexistent'));
      expect(result).toBeNull();
    });

    it('should apply schema migration when data is read', async () => {
      const rawData = { version: '1.0', hashes: {}, commits: [] };
      mockRead.mockResolvedValue(rawData);
      mockMigrate.mockReturnValue(rawData);

      await repo.findAllHashes();
      expect(mockMigrate).toHaveBeenCalledWith(rawData);
    });
  });

  describe('findHashByPath', () => {
    it('should return null if hash not found', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      const result = await repo.findHashByPath(new FilePath('not-there'));
      expect(result).toBeNull();
    });

    it('should return mapped FileHash if found', async () => {
      const filePath = 'src/app.ts';
      const hashId = 'hash-app';
      const hashValue = hexHash('b');   // 'b'*64 -> valid hex
      const entry = {
        id: hashId,
        filePath,
        hashValue,
        committedAt: null,
        commitId: null,
      };
      const index = {
        version: '1.0',
        hashes: { [filePath]: entry },
        commits: [],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);   // <-- important: set migrator return

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
      mockMigrate.mockReturnValue(defaultIndex);   // <-- FIX: override migrator
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
        commits: [],
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
      const fileHash = createFileHash({ filePath: 'new.ts', hash: hexHash('c') });
      await repo.saveHash(fileHash);

      const written = mockWrite.mock.calls[0][1];
      expect(written.hashes['new.ts']).toBeDefined();
      expect(written.hashes['new.ts'].hashValue).toBe(hexHash('c').toLowerCase());
    });

    it('should overwrite existing hash entry for the same path', async () => {
      const existingPath = 'src/existing.ts';
      const oldHash = hexHash('0');   // valid hex
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
        commits: [],
      };
      mockRead.mockResolvedValue(existingIndex);
      mockMigrate.mockReturnValue(existingIndex);

      const newFileHash = createFileHash({
        id: 'new-id',
        filePath: existingPath,
        hash: hexHash('f'),   // valid hex
      });
      await repo.saveHash(newFileHash);

      const written = mockWrite.mock.calls[0][1];
      expect(written.hashes[existingPath].id).toBe('new-id');
      expect(written.hashes[existingPath].hashValue).toBe(hexHash('f').toLowerCase());
    });
  });

  describe('findCommitById', () => {
    const hashA = hexHash('a');
    const commitEntry = {
      id: 'commit-1',
      documentId: 'doc-1',
      fileHashIds: ['hash-1'],
      committedAt: '2025-06-01T12:00:00Z',
      status: 'PENDING',
    };
    const indexWithCommit = {
      version: '1.0',
      hashes: {
        'hash-1': { id: 'hash-1', filePath: 'f.ts', hashValue: hashA, committedAt: null, commitId: null },
      },
      commits: [commitEntry],
    };

    beforeEach(() => {
      mockRead.mockResolvedValue(indexWithCommit);
      mockMigrate.mockReturnValue(indexWithCommit);
    });

    it('should return mapped GranularCommit if found', async () => {
      const result = await repo.findCommitById(new CommitId('commit-1'));
      expect(result).toBeInstanceOf(GranularCommit);
      expect(result!.id.value).toBe('commit-1');
      expect(result!.documentId.value).toBe('doc-1');
      expect(result!.fileHashes).toHaveLength(1);
      expect(result!.fileHashes[0]).toBeInstanceOf(FileHash);
    });

    it('should return null if commit not found', async () => {
      const result = await repo.findCommitById(new CommitId('missing'));
      expect(result).toBeNull();
    });
  });

  describe('saveCommit', () => {
    it('should add new commit if not existing', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      const commit = createCommit();
      await repo.saveCommit(commit);

      const written = mockWrite.mock.calls[0][1];
      expect(written.commits).toHaveLength(1);
      expect(written.commits[0].id).toBe('commit-1');
      expect(written.commits[0].status).toBe('PENDING');
    });

    it('should update existing commit if present', async () => {
      const existing = {
        id: 'commit-1',
        documentId: 'doc-1',
        fileHashIds: [],
        committedAt: 'old-date',
        status: 'PENDING',
      };
      const index = { version: '1.0', hashes: {}, commits: [existing] };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const updatedCommit = createCommit({ approved: true });
      await repo.saveCommit(updatedCommit);

      const written = mockWrite.mock.calls[0][1];
      expect(written.commits[0].status).toBe('APPROVED');
    });
  });

  describe('findPendingCommits', () => {
    it('should return only pending commits', async () => {
      const index = {
        version: '1.0',
        hashes: {},
        commits: [
          { id: 'c1', documentId: 'd1', fileHashIds: [], committedAt: 'date', status: 'PENDING' },
          { id: 'c2', documentId: 'd2', fileHashIds: [], committedAt: 'date', status: 'APPROVED' },
        ],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findPendingCommits();
      expect(result).toHaveLength(1);
      expect(result[0].id.value).toBe('c1');
    });
  });

  describe('findCommitsByDocument', () => {
    it('should filter commits by documentId', async () => {
      const index = {
        version: '1.0',
        hashes: {},
        commits: [
          { id: 'c1', documentId: 'doc-A', fileHashIds: [], committedAt: 'date', status: 'PENDING' },
          { id: 'c2', documentId: 'doc-B', fileHashIds: [], committedAt: 'date', status: 'PENDING' },
          { id: 'c3', documentId: 'doc-A', fileHashIds: [], committedAt: 'date', status: 'APPROVED' },
        ],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findCommitsByDocument(new DocumentId('doc-A'));
      expect(result).toHaveLength(2);
      expect(result.map(c => c.id.value)).toEqual(['c1', 'c3']);
    });
  });
});