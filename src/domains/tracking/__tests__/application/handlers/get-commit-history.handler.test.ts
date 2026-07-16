import { GetCommitHistoryHandler } from '../../../application/handlers/get-commit-history.handler';
import { GetCommitHistoryQuery } from '../../../application/queries/get-commit-history.query';
import { ICommitRepository } from '../../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../../domain/repository/document-commit-approval-repository.interface';
import { GranularCommit } from '../../../domain/entities/granular-commit';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DocumentCommitApproval } from '../../../domain/entities/document-commit-approval';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('GetCommitHistoryHandler', () => {
  let handler: GetCommitHistoryHandler;
  let mockCommitRepo: jest.Mocked<ICommitRepository>;
  let mockApprovalRepo: jest.Mocked<IDocumentCommitApprovalRepository>;

  beforeEach(() => {
    mockCommitRepo = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
    };

    mockApprovalRepo = {
      findByDocument: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Inject BOTH required repositories
    handler = new GetCommitHistoryHandler(mockCommitRepo, mockApprovalRepo);
  });

  it('should return approved commits sorted by date descending', async () => {
    const docId = new DocumentId('doc-1');
    const commitId1 = new CommitId('commit-1');
    const commitId2 = new CommitId('commit-2');
    
    const commit1 = new GranularCommit(
      commitId1,
      [new FileHash(new FileHashId('fh-1'), new FilePath('src/app.ts'), new HashValue('a'.repeat(64)))],
      DateTime.fromISO('2026-01-15T10:00:00.000Z')
    );
    
    const commit2 = new GranularCommit(
      commitId2,
      [new FileHash(new FileHashId('fh-2'), new FilePath('src/other.ts'), new HashValue('b'.repeat(64)))],
      DateTime.fromISO('2026-01-20T10:00:00.000Z')
    );

    const approvals = [
      new DocumentCommitApproval(docId, commitId1, DateTime.fromISO('2026-01-15T10:05:00.000Z')),
      new DocumentCommitApproval(docId, commitId2, DateTime.fromISO('2026-01-20T10:05:00.000Z'))
    ];

    mockApprovalRepo.findByDocument.mockResolvedValue(approvals);
    mockCommitRepo.findById.mockImplementation(async (id) => {
      if (id.value === 'commit-1') return commit1;
      if (id.value === 'commit-2') return commit2;
      return null;
    });

    const result = await handler.execute(new GetCommitHistoryQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(2);
    expect(dtos[0].id).toBe('commit-2'); // newer first
    expect(dtos[1].id).toBe('commit-1');
    expect(dtos[0].status).toBe('APPROVED');
    expect(dtos[0].documentId).toBe('doc-1');
  });

  it('should skip duplicate approvals for the same commit', async () => {
    const docId = new DocumentId('doc-1');
    const commitId1 = new CommitId('commit-1');
    
    const commit1 = new GranularCommit(commitId1, [], DateTime.now());

    const approvals = [
      new DocumentCommitApproval(docId, commitId1, DateTime.now()),
      new DocumentCommitApproval(docId, commitId1, DateTime.now()) // Duplicate
    ];

    mockApprovalRepo.findByDocument.mockResolvedValue(approvals);
    mockCommitRepo.findById.mockResolvedValue(commit1);

    const result = await handler.execute(new GetCommitHistoryQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(mockCommitRepo.findById).toHaveBeenCalledTimes(1); // Deduplication worked
  });

  it('should return empty array when no approvals exist', async () => {
    mockApprovalRepo.findByDocument.mockResolvedValue([]);

    const result = await handler.execute(new GetCommitHistoryQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });

  it('should return failure on invalid documentId', async () => {
    // Passing empty string triggers DocumentId validation error, caught by handler
    const result = await handler.execute(new GetCommitHistoryQuery(''));
    expect(result.isFailure).toBe(true);
  });
});