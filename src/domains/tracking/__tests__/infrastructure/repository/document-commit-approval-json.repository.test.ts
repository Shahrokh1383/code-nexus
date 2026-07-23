import { DocumentCommitApprovalJsonRepository } from '../../../infrastructure/repository/document-commit-approval-json.repository';
import { JsonDatabase } from '../../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../../infrastructure/persistence/migration/schema-migrator';
import { DocumentCommitApproval } from '../../../domain/entities/document-commit-approval';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../../domain/value-objects/commit-id';
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

const emptyIndex = { version: '1.0', approvals: {} };

describe('DocumentCommitApprovalJsonRepository', () => {
  let repo: DocumentCommitApprovalJsonRepository;

  beforeEach(() => {
    repo = new DocumentCommitApprovalJsonRepository('/fake/root');
  });

  describe('findByDocument', () => {
    it('should return empty array when no approvals exist', async () => {
      mockRead.mockResolvedValue(emptyIndex);
      mockMigrate.mockReturnValue(emptyIndex);
      const result = await repo.findByDocument(new DocumentId('doc-1'));
      expect(result).toEqual([]);
    });

    it('should return mapped approvals', async () => {
      const index = {
        version: '1.0',
        approvals: {
          'doc-1': [
            { commitId: 'commit-1', approvedAt: '2024-01-01T00:00:00.000Z' },
          ],
        },
      };
      mockRead.mockResolvedValue(index);
      mockMigrate.mockReturnValue(index);
      const result = await repo.findByDocument(new DocumentId('doc-1'));
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(DocumentCommitApproval);
      expect(result[0].documentId.value).toBe('doc-1');
      expect(result[0].commitId.value).toBe('commit-1');
    });
  });

  describe('save', () => {
    it('should add approval for a new document', async () => {
      mockRead.mockResolvedValue(emptyIndex);
      mockMigrate.mockReturnValue(emptyIndex);
      const approval = new DocumentCommitApproval(
        new DocumentId('doc-1'),
        new CommitId('commit-1'),
        DateTime.fromISO('2024-01-01'),
      );
      await repo.save(approval);
      const written = mockWrite.mock.calls[0][1];
      expect(written.approvals['doc-1']).toBeDefined();
      expect(written.approvals['doc-1'].length).toBe(1);
      expect(written.approvals['doc-1'][0].commitId).toBe('commit-1');
    });

    it('should append to existing document approvals', async () => {
      const existing = {
        version: '1.0',
        approvals: {
          'doc-1': [{ commitId: 'commit-1', approvedAt: '2024-01-01T00:00:00.000Z' }],
        },
      };
      mockRead.mockResolvedValue(existing);
      mockMigrate.mockReturnValue(existing);
      const approval = new DocumentCommitApproval(
        new DocumentId('doc-1'),
        new CommitId('commit-2'),
        DateTime.fromISO('2024-02-01'),
      );
      await repo.save(approval);
      const written = mockWrite.mock.calls[0][1];
      expect(written.approvals['doc-1']).toHaveLength(2);
    });
  });

  it('should handle ENOENT gracefully', async () => {
    const err = new Error('no file') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockRead.mockRejectedValue(err);
    const result = await repo.findByDocument(new DocumentId('doc-1'));
    expect(result).toEqual([]);
  });
});