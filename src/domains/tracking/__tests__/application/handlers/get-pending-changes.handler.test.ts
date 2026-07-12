import { GetPendingChangesHandler } from '../../../application/handlers/get-pending-changes.handler';
import { GetPendingChangesQuery } from '../../../application/queries/get-pending-changes.query';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';

describe('GetPendingChangesHandler', () => {
  let handler: GetPendingChangesHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn(),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
    };

    mockLinkedDocQuery = {
      findLinkedDocuments: jest.fn().mockResolvedValue([]), // may be unused but kept for interface
      findLinkedFiles: jest.fn().mockResolvedValue([]),
    };

    handler = new GetPendingChangesHandler(mockHashRepo, mockLinkedDocQuery);
  });

  it('should return all pending hashes when no documentId', async () => {
    const pendingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    mockHashRepo.findAllHashes.mockResolvedValue([pendingHash]);

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
    mockHashRepo.findAllHashes.mockResolvedValue([pendingHash1, pendingHash2]);

    // findLinkedFiles now returns file paths linked to the given document ID
    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts']);

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

    mockHashRepo.findAllHashes.mockResolvedValue([pendingHash, approvedHash]);

    const result = await handler.execute(new GetPendingChangesQuery());

    expect(result.isSuccess).toBe(true);
    const dtos = result.getValue()!;
    expect(dtos.length).toBe(1);
    expect(dtos[0].filePath).toBe('src/app.ts');
  });

  it('should return empty array when no pending hashes', async () => {
    mockHashRepo.findAllHashes.mockResolvedValue([]);

    const result = await handler.execute(new GetPendingChangesQuery());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([]);
  });
});