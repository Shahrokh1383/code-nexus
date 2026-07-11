import { GetPendingChangesHandler } from '../../../application/handlers/get-pending-changes.handler';
import { GetPendingChangesQuery } from '../../../application/queries/get-pending-changes.query';
import { ITrackingRepository } from '../../../domain/repository/tracking-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';

describe('GetPendingChangesHandler', () => {
  let handler: GetPendingChangesHandler;
  let mockRepo: jest.Mocked<ITrackingRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;

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

    mockLinkedDocQuery = {
      findLinkedDocuments: jest.fn().mockResolvedValue([]),
    };

    handler = new GetPendingChangesHandler(mockRepo, mockLinkedDocQuery);
  });

  it('should return all pending hashes when no documentId', async () => {
    const pendingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    mockRepo.findAllHashes.mockResolvedValue([pendingHash]);

    const result = await handler.execute(new GetPendingChangesQuery());

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].filePath).toBe('src/app.ts');
    expect(dtos[0].status).toBe('PENDING');
  });

  it('should filter by documentId when provided', async () => {
    const pendingHash1 = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    const pendingHash2 = new FileHash(
      new FileHashId('fh-2'),
      new FilePath('src/other.ts'),
      new HashValue('b'.repeat(64))
    );
    mockRepo.findAllHashes.mockResolvedValue([pendingHash1, pendingHash2]);
    mockLinkedDocQuery.findLinkedDocuments.mockImplementation(async (path: string) => {
      if (path === 'src/app.ts') return [new DocumentId('doc-1')];
      return [];
    });

    const result = await handler.execute(new GetPendingChangesQuery('doc-1'));

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].filePath).toBe('src/app.ts');
  });

  it('should exclude approved hashes', async () => {
    const pendingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    const approvedHash = new FileHash(
      new FileHashId('fh-2'),
      new FilePath('src/other.ts'),
      new HashValue('b'.repeat(64))
    );
    const { CommitId } = require('../../../domain/value-objects/commit-id');
    approvedHash.commit(new CommitId('commit-1'));

    mockRepo.findAllHashes.mockResolvedValue([pendingHash, approvedHash]);

    const result = await handler.execute(new GetPendingChangesQuery());

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].filePath).toBe('src/app.ts');
  });

  it('should return empty array when no pending hashes', async () => {
    mockRepo.findAllHashes.mockResolvedValue([]);

    const result = await handler.execute(new GetPendingChangesQuery());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });
});