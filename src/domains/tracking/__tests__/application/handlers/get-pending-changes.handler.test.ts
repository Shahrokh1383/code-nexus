import { GetPendingChangesHandler } from '../../../application/handlers/get-pending-changes.handler';
import { GetPendingChangesQuery } from '../../../application/queries/get-pending-changes.query';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../../domain/repository/document-commit-approval-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DocumentCommitApproval } from '../../../domain/entities/document-commit-approval';
import { GranularCommit } from '../../../domain/entities/granular-commit';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { DateTime } from '../../../../shared-kernel/types/date-time';

describe('GetPendingChangesHandler', () => {
  let handler: GetPendingChangesHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockCommitRepo: jest.Mocked<ICommitRepository>;
  let mockApprovalRepo: jest.Mocked<IDocumentCommitApprovalRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn(),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
      deleteAllExcept: jest.fn(),
    } as any;

    mockCommitRepo = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
    } as any;

    mockApprovalRepo = {
      findByDocument: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockLinkedDocQuery = {
      findLinkedDocuments: jest.fn().mockResolvedValue([]),
      findLinkedFiles: jest.fn().mockResolvedValue([]),
    } as any;

    // Inject ALL 4 required dependencies
    handler = new GetPendingChangesHandler(
      mockHashRepo, 
      mockCommitRepo, 
      mockApprovalRepo, 
      mockLinkedDocQuery
    );
  });

  it('should return empty array when no documentId is provided', async () => {
    // The handler explicitly returns an empty array if no documentId is provided (safe fallback)
    const result = await handler.execute(new GetPendingChangesQuery());

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(0);
  });

  it('should return all linked files as pending when no approvals exist', async () => {
    const pendingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );

    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts']);
    mockApprovalRepo.findByDocument.mockResolvedValue([]); // No approvals
    mockHashRepo.findHashByPath.mockResolvedValue(pendingHash);

    const result = await handler.execute(new GetPendingChangesQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].filePath).toBe('src/app.ts');
    expect(dtos[0].status).toBe('PENDING');
  });

  it('should exclude approved hashes by comparing with committed hashes', async () => {
    const pendingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64)) // Different hash -> PENDING
    );
    const approvedHash = new FileHash(
      new FileHashId('fh-2'),
      new FilePath('src/other.ts'),
      new HashValue('b'.repeat(64)) // Same hash as committed -> NOT PENDING
    );

    const commitId = new CommitId('commit-1');
    const docId = new DocumentId('doc-1');
    const approvedAt = DateTime.now();

    // The committed state is tracked via GranularCommit, NOT via a .commit() method on FileHash
    const committedCommit = new GranularCommit(
      commitId,
      [
        new FileHash(new FileHashId('fh-2'), new FilePath('src/other.ts'), new HashValue('b'.repeat(64)))
      ],
      approvedAt
    );

    const approval = new DocumentCommitApproval(docId, commitId, approvedAt);

    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts', 'src/other.ts']);
    mockApprovalRepo.findByDocument.mockResolvedValue([approval]);
    mockCommitRepo.findById.mockResolvedValue(committedCommit);
    
    mockHashRepo.findHashByPath.mockImplementation(async (path) => {
      if (path.value === 'src/app.ts') return pendingHash;
      if (path.value === 'src/other.ts') return approvedHash;
      return null;
    });

    const result = await handler.execute(new GetPendingChangesQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].filePath).toBe('src/app.ts');
    expect(dtos[0].status).toBe('PENDING');
  });

  it('should return empty array when no linked files exist', async () => {
    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue([]);
    mockApprovalRepo.findByDocument.mockResolvedValue([]);

    const result = await handler.execute(new GetPendingChangesQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });
});