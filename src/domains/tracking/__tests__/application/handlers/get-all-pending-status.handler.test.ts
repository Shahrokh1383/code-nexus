import { GetAllPendingStatusHandler } from '../../../application/handlers/get-all-pending-status.handler';
import { GetAllPendingStatusQuery } from '../../../application/queries/get-all-pending-status.query';
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

describe('GetAllPendingStatusHandler', () => {
  let handler: GetAllPendingStatusHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockCommitRepo: jest.Mocked<ICommitRepository>;
  let mockApprovalRepo: jest.Mocked<IDocumentCommitApprovalRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn(),
      saveHash: jest.fn(),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
      deleteAllExcept: jest.fn(),
    } as any;

    mockCommitRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
    } as any;

    mockApprovalRepo = {
      findByDocument: jest.fn(),
      save: jest.fn(),
    } as any;

    mockLinkedDocQuery = {
      findLinkedDocuments: jest.fn(),
      findLinkedFiles: jest.fn(),
    } as any;

    handler = new GetAllPendingStatusHandler(
      mockHashRepo,
      mockCommitRepo,
      mockApprovalRepo,
      mockLinkedDocQuery,
    );
  });

  const createHash = (id: string, path: string, hashChar: string = 'a') =>
    new FileHash(new FileHashId(id), new FilePath(path), new HashValue(hashChar.repeat(64)));

  const createApproval = (docId: string, commitId: string) =>
    new DocumentCommitApproval(new DocumentId(docId), new CommitId(commitId), DateTime.now());

  const createCommit = (id: string, filePaths: string[], hashChars: string[]) =>
    new GranularCommit(
      new CommitId(id),
      filePaths.map((p, i) => createHash(`fh-${p}`, p, hashChars[i] || 'a')),
      DateTime.now(),
    );

  it('should return empty array when no hashes exist', async () => {
    mockHashRepo.findAllHashes.mockResolvedValue([]);
    const result = await handler.execute(new GetAllPendingStatusQuery());
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });

  it('should count pending when document has no approval', async () => {
    const hash = createHash('fh-1', 'src/app.ts', 'a');
    mockHashRepo.findAllHashes.mockResolvedValue([hash]);
    mockLinkedDocQuery.findLinkedDocuments.mockResolvedValue([new DocumentId('doc-1')]);
    mockApprovalRepo.findByDocument.mockResolvedValue([]); // no approval

    const result = await handler.execute(new GetAllPendingStatusQuery());
    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toEqual({ documentId: 'doc-1', pendingCount: 1 });
  });

  it('should count pending when latest commit does not contain the file hash', async () => {
    const hash = createHash('fh-1', 'src/app.ts', 'a');
    mockHashRepo.findAllHashes.mockResolvedValue([hash]);
    mockLinkedDocQuery.findLinkedDocuments.mockResolvedValue([new DocumentId('doc-1')]);
    const approval = createApproval('doc-1', 'commit-1');
    mockApprovalRepo.findByDocument.mockResolvedValue([approval]);
    // commit exists but does NOT contain the file hash
    const commit = createCommit('commit-1', [], []);
    mockCommitRepo.findById.mockResolvedValue(commit);

    const result = await handler.execute(new GetAllPendingStatusQuery());
    const dtos = result.getValue()!;
    expect(dtos[0].pendingCount).toBe(1);
  });

  it('should count pending when committed hash differs', async () => {
    const hash = createHash('fh-1', 'src/app.ts', 'a'); // current hash 'aaa...'
    mockHashRepo.findAllHashes.mockResolvedValue([hash]);
    mockLinkedDocQuery.findLinkedDocuments.mockResolvedValue([new DocumentId('doc-1')]);
    const approval = createApproval('doc-1', 'commit-1');
    mockApprovalRepo.findByDocument.mockResolvedValue([approval]);
    // committed hash is 'bbb...' (different)
    const commit = createCommit('commit-1', ['src/app.ts'], ['b']);
    mockCommitRepo.findById.mockResolvedValue(commit);

    const result = await handler.execute(new GetAllPendingStatusQuery());
    const dtos = result.getValue()!;
    expect(dtos[0].pendingCount).toBe(1);
  });

  it('should not count when hash matches committed hash', async () => {
    const hash = createHash('fh-1', 'src/app.ts', 'a');
    mockHashRepo.findAllHashes.mockResolvedValue([hash]);
    mockLinkedDocQuery.findLinkedDocuments.mockResolvedValue([new DocumentId('doc-1')]);
    const approval = createApproval('doc-1', 'commit-1');
    mockApprovalRepo.findByDocument.mockResolvedValue([approval]);
    const commit = createCommit('commit-1', ['src/app.ts'], ['a']);
    mockCommitRepo.findById.mockResolvedValue(commit);

    const result = await handler.execute(new GetAllPendingStatusQuery());
    expect(result.getValue()).toEqual([]);
  });

  it('should aggregate counts per document across multiple hashes', async () => {
    const hash1 = createHash('fh-1', 'src/a.ts', 'a');
    const hash2 = createHash('fh-2', 'src/b.ts', 'b');
    mockHashRepo.findAllHashes.mockResolvedValue([hash1, hash2]);
    // doc-1 linked to both files, no approval
    mockLinkedDocQuery.findLinkedDocuments
      .mockResolvedValueOnce([new DocumentId('doc-1')])
      .mockResolvedValueOnce([new DocumentId('doc-1')]);
    mockApprovalRepo.findByDocument.mockResolvedValue([]);

    const result = await handler.execute(new GetAllPendingStatusQuery());
    const dtos = result.getValue()!;
    expect(dtos).toHaveLength(1);
    expect(dtos[0]).toEqual({ documentId: 'doc-1', pendingCount: 2 });
  });

  it('should handle multiple documents', async () => {
    const hash = createHash('fh-1', 'src/app.ts', 'a');
    mockHashRepo.findAllHashes.mockResolvedValue([hash]);
    // file linked to two documents
    mockLinkedDocQuery.findLinkedDocuments.mockResolvedValue([
      new DocumentId('doc-1'),
      new DocumentId('doc-2'),
    ]);
    mockApprovalRepo.findByDocument.mockResolvedValue([]); // both no approval

    const result = await handler.execute(new GetAllPendingStatusQuery());
    const dtos = result.getValue()!;
    expect(dtos).toHaveLength(2);
    expect(dtos.map(d => d.documentId).sort()).toEqual(['doc-1', 'doc-2']);
  });

  it('should return failure on repository error', async () => {
    mockHashRepo.findAllHashes.mockRejectedValue(new Error('DB error'));
    const result = await handler.execute(new GetAllPendingStatusQuery());
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('DB error');
  });
});