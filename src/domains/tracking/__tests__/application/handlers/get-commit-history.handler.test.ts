import { GetCommitHistoryHandler } from '../../../application/handlers/get-commit-history.handler';
import { GetCommitHistoryQuery } from '../../../application/queries/get-commit-history.query';
import { ITrackingRepository } from '../../../domain/repository/tracking-repository.interface';
import { GranularCommit } from '../../../domain/entities/granular-commit';
import { CommitId } from '../../../domain/value-objects/commit-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DateTime } from '../../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../../domain/value-objects/commit-status';

describe('GetCommitHistoryHandler', () => {
  let handler: GetCommitHistoryHandler;
  let mockRepo: jest.Mocked<ITrackingRepository>;

  beforeEach(() => {
    mockRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn(),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findCommitById: jest.fn(),
      saveCommit: jest.fn().mockResolvedValue(undefined),
      findPendingCommits: jest.fn(),
      findCommitsByDocument: jest.fn(),
    };

    handler = new GetCommitHistoryHandler(mockRepo);
  });

  it('should return approved commits sorted by date descending', async () => {
    const commit1 = new GranularCommit(
      new CommitId('commit-1'),
      new DocumentId('doc-1'),
      [
        new FileHash(
          new FileHashId('fh-1'),
          new FilePath('src/app.ts'),
          new HashValue('a'.repeat(64))
        ),
      ],
      DateTime.fromISO('2026-01-15T10:00:00.000Z'),
      CommitStatus.approved()
    );
    const commit2 = new GranularCommit(
      new CommitId('commit-2'),
      new DocumentId('doc-1'),
      [
        new FileHash(
          new FileHashId('fh-2'),
          new FilePath('src/other.ts'),
          new HashValue('b'.repeat(64))
        ),
      ],
      DateTime.fromISO('2026-01-20T10:00:00.000Z'),
      CommitStatus.approved()
    );

    mockRepo.findCommitsByDocument.mockResolvedValue([commit1, commit2]);

    const result = await handler.execute(new GetCommitHistoryQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(2);
    expect(dtos[0].id).toBe('commit-2'); // newer first
    expect(dtos[1].id).toBe('commit-1');
  });

  it('should exclude pending commits', async () => {
    const approvedCommit = new GranularCommit(
      new CommitId('commit-1'),
      new DocumentId('doc-1'),
      [],
      DateTime.now(),
      CommitStatus.approved()
    );
    const pendingCommit = new GranularCommit(
      new CommitId('commit-2'),
      new DocumentId('doc-1'),
      [],
      DateTime.now(),
      CommitStatus.pending()
    );

    mockRepo.findCommitsByDocument.mockResolvedValue([approvedCommit, pendingCommit]);

    const result = await handler.execute(new GetCommitHistoryQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].id).toBe('commit-1');
  });

  it('should return empty array when no commits exist', async () => {
    mockRepo.findCommitsByDocument.mockResolvedValue([]);

    const result = await handler.execute(new GetCommitHistoryQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });

  it('should return failure on invalid documentId', async () => {
    const result = await handler.execute(new GetCommitHistoryQuery(''));
    expect(result.isFailure).toBe(true);
  });
});