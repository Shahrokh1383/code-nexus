import { ApproveCommitHandler } from '../../../application/handlers/approve-commit.handler';
import { ApproveCommitCommand } from '../../../application/commands/approve-commit.command';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../../domain/repository/commit-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../../domain/value-objects/commit-id';

describe('ApproveCommitHandler', () => {
  let handler: ApproveCommitHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockCommitRepo: jest.Mocked<ICommitRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn().mockResolvedValue([]),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
    };

    mockCommitRepo = {
      findById: jest.fn(),
      findByDocument: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
    };

    mockLinkedDocQuery = {
      findLinkedDocuments: jest.fn().mockResolvedValue([]),
      findLinkedFiles: jest.fn().mockResolvedValue([]),
    };

    handler = new ApproveCommitHandler(mockHashRepo, mockCommitRepo, mockLinkedDocQuery);
    EventBus.getInstance().clear();
  });

  afterEach(() => {
    EventBus.getInstance().clear();
  });

  it('should approve commit for pending hashes', async () => {
    const pendingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    // The handler will call findAllHashes (returns pendingHash) and findLinkedFiles
    mockHashRepo.findAllHashes.mockResolvedValue([pendingHash]);
    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts']);

    const emittedEvents: string[] = [];
    EventBus.getInstance().register('CommitApprovedEvent', {
      handle: async (event) => {
        emittedEvents.push(event.eventType);
      },
    });

    const result = await handler.execute(
      new ApproveCommitCommand('doc-1')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockHashRepo.saveHash).toHaveBeenCalledTimes(1);
    expect(mockCommitRepo.save).toHaveBeenCalledTimes(1);
    expect(emittedEvents).toContain('CommitApprovedEvent');
  });

  it('should do nothing when no pending hashes exist', async () => {
    // findAllHashes returns empty, so no linked files needed
    mockHashRepo.findAllHashes.mockResolvedValue([]);

    const result = await handler.execute(
      new ApproveCommitCommand('doc-1')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockHashRepo.saveHash).not.toHaveBeenCalled();
    expect(mockCommitRepo.save).not.toHaveBeenCalled();
  });

  it('should only affect hashes without commitId', async () => {
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
    // simulate approved by calling commit
    approvedHash.commit(new CommitId('commit-old'));

    mockHashRepo.findAllHashes.mockResolvedValue([pendingHash, approvedHash]);
    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts', 'src/other.ts']); // both linked, but only pending will be processed

    await handler.execute(new ApproveCommitCommand('doc-1'));

    // Only the pending hash should be saved
    expect(mockHashRepo.saveHash).toHaveBeenCalledTimes(1);
    const saved = mockHashRepo.saveHash.mock.calls[0][0] as FileHash;
    expect(saved.id.value).toBe('fh-1');
  });

  it('should return failure on invalid documentId', async () => {
    const result = await handler.execute(
      new ApproveCommitCommand('')
    );
    expect(result.isFailure).toBe(true);
  });
});