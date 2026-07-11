import { TrackingJsonRepository } from '../../../infrastructure/repository/tracking-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';

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

// Helper to create a minimal mock FileHash (just enough shape for mapping)
const createMockFileHash = (overrides: any = {}) => ({
  id: { value: overrides.id ?? 'hash1' },
  filePath: { value: overrides.filePath ?? 'src/index.ts' },
  hashValue: { value: overrides.hashValue ?? 'abcdef' },
  committedAt: overrides.committedAt ?? undefined,
  commitId: overrides.commitId ?? undefined,
});

// Helper to create a minimal mock GranularCommit
const createMockCommit = (overrides: any = {}) => ({
  id: { value: overrides.id ?? 'commit1' },
  documentId: { value: overrides.documentId ?? 'doc-1' },
  fileHashes: overrides.fileHashes ?? [createMockFileHash()],
  committedAt: overrides.committedAt ?? { toISO: () => '2025-01-01T00:00:00Z' },
  status: overrides.status ?? { isApproved: false },
});

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
      // findHashByPath triggers readIndex, should get empty index
      const result = await repo.findHashByPath({ value: 'nonexistent' } as any);
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
      const result = await repo.findHashByPath({ value: 'not-there' } as any);
      expect(result).toBeNull();
    });

    it('should return mapped FileHash if found', async () => {
      const hashEntry = {
        id: 'hash-id',
        filePath: 'src/app.ts',
        hashValue: 'abc123',
        committedAt: null,
        commitId: null,
      };
      const index = {
        version: '1.0',
        hashes: { 'src/app.ts': hashEntry },
        commits: [],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findHashByPath({ value: 'src/app.ts' } as any);

      // Result is a FileHash entity – we can check its value objects
      expect(result).toBeDefined();
      expect(result!.id.value).toBe('hash-id');
      expect(result!.filePath.value).toBe('src/app.ts');
      expect(result!.hashValue.value).toBe('abc123');
      // committedAt and commitId should be undefined (or None)
      expect(result!.committedAt).toBeUndefined();
      expect(result!.commitId).toBeUndefined();
    });
  });

  describe('findAllHashes', () => {
    it('should return empty array for empty index', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      const result = await repo.findAllHashes();
      expect(result).toEqual([]);
    });

    it('should return array of all hashes', async () => {
      const index = {
        version: '1.0',
        hashes: {
          'a.ts': { id: '1', filePath: 'a.ts', hashValue: 'aaa', committedAt: null, commitId: null },
          'b.ts': { id: '2', filePath: 'b.ts', hashValue: 'bbb', committedAt: null, commitId: null },
        },
        commits: [],
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const result = await repo.findAllHashes();
      expect(result).toHaveLength(2);
      expect(result[0].filePath.value).toBe('a.ts');
      expect(result[1].filePath.value).toBe('b.ts');
    });
  });

  describe('saveHash', () => {
    it('should add a new hash entry', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      const fileHash = createMockFileHash();
      await repo.saveHash(fileHash as any);

      expect(mockWrite).toHaveBeenCalledWith('tracking-index.json', {
        version: '1.0',
        hashes: {
          'src/index.ts': {
            id: 'hash1',
            filePath: 'src/index.ts',
            hashValue: 'abcdef',
            committedAt: null,
            commitId: null,
          },
        },
        commits: [],
      });
    });

    it('should overwrite existing hash entry for the same path', async () => {
      const existingIndex = {
        version: '1.0',
        hashes: {
          'src/index.ts': { id: 'old-hash', filePath: 'src/index.ts', hashValue: 'old', committedAt: '2024-01-01T00:00:00Z', commitId: 'commit-old' },
        },
        commits: [],
      };
      mockRead.mockResolvedValue(existingIndex);
      const newHash = createMockFileHash({ hashValue: 'newhash' });
      await repo.saveHash(newHash as any);

      const writeCall = mockWrite.mock.calls[0][1];
      expect(writeCall.hashes['src/index.ts'].hashValue).toBe('newhash');
      expect(writeCall.hashes['src/index.ts'].id).toBe('hash1');
    });
  });

  describe('findCommitById', () => {
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
        'hash-1': { id: 'hash-1', filePath: 'f.ts', hashValue: 'h1', committedAt: null, commitId: null },
      },
      commits: [commitEntry],
    };

    beforeEach(() => {
      mockRead.mockResolvedValue(indexWithCommit);
      mockMigrate.mockReturnValue(indexWithCommit);
    });

    it('should return mapped GranularCommit if found', async () => {
      const result = await repo.findCommitById({ value: 'commit-1' } as any);
      expect(result).toBeDefined();
      expect(result!.id.value).toBe('commit-1');
      expect(result!.documentId.value).toBe('doc-1');
      expect(result!.fileHashes).toHaveLength(1);
    });

    it('should return null if commit not found', async () => {
      const result = await repo.findCommitById({ value: 'missing' } as any);
      expect(result).toBeNull();
    });
  });

  describe('saveCommit', () => {
    it('should add new commit if not existing', async () => {
      mockRead.mockResolvedValue(defaultIndex);
      const commit = createMockCommit();
      await repo.saveCommit(commit as any);

      expect(mockWrite).toHaveBeenCalledWith('tracking-index.json', expect.objectContaining({
        commits: expect.arrayContaining([
          expect.objectContaining({
            id: 'commit1',
            documentId: 'doc-1',
            status: 'PENDING',
          }),
        ]),
      }));
    });

    it('should update existing commit if present', async () => {
      const existingCommitEntry = { id: 'commit1', documentId: 'doc-1', fileHashIds: [], committedAt: 'old-date', status: 'PENDING' };
      const index = { version: '1.0', hashes: {}, commits: [existingCommitEntry] };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);

      const updatedCommit = createMockCommit({ status: { isApproved: true } });
      await repo.saveCommit(updatedCommit as any);

      const writeArgs = mockWrite.mock.calls[0][1];
      expect(writeArgs.commits[0].status).toBe('APPROVED');
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

      const result = await repo.findCommitsByDocument({ value: 'doc-A' } as any);
      expect(result).toHaveLength(2);
      expect(result.map(c => c.id.value)).toEqual(['c1', 'c3']);
    });
  });
});