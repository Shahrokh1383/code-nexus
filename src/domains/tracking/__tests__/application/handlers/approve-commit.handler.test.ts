import { ApproveCommitHandler } from '../../../application/handlers/approve-commit.handler';
import { ApproveCommitCommand } from '../../../application/commands/approve-commit.command';
import { ITrackingRepository } from '../../../domain/repository/tracking-repository.interface';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';

describe('ApproveCommitHandler', () => {
  let handler: ApproveCommitHandler;
  let mockRepo: jest.Mocked<ITrackingRepository>;

  beforeEach(() => {
    mockRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn().mockResolvedValue([]),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findCommitById: jest.fn(),
      saveCommit: jest.fn().mockResolvedValue(undefined),
      findPendingCommits: jest.fn(),
      findCommitsByDocument: jest.fn(),
    };

    handler = new ApproveCommitHandler(mockRepo);
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
    mockRepo.findAllHashes.mockResolvedValue([pendingHash]);

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
    expect(mockRepo.saveHash).toHaveBeenCalledTimes(1);
    expect(mockRepo.saveCommit).toHaveBeenCalledTimes(1);
    expect(emittedEvents).toContain('CommitApprovedEvent');
  });

  it('should do nothing when no pending hashes exist', async () => {
    mockRepo.findAllHashes.mockResolvedValue([]);

    const result = await handler.execute(
      new ApproveCommitCommand('doc-1')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.saveHash).not.toHaveBeenCalled();
    expect(mockRepo.saveCommit).not.toHaveBeenCalled();
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
    // Simulate approved by calling commit
    const { CommitId } = require('../../../domain/value-objects/commit-id');
    approvedHash.commit(new CommitId('commit-old'));

    mockRepo.findAllHashes.mockResolvedValue([pendingHash, approvedHash]);

    await handler.execute(new ApproveCommitCommand('doc-1'));

    // Only the pending hash should be saved
    expect(mockRepo.saveHash).toHaveBeenCalledTimes(1);
    const saved = mockRepo.saveHash.mock.calls[0][0] as FileHash;
    expect(saved.id.value).toBe('fh-1');
  });

  it('should return failure on invalid documentId', async () => {
    const result = await handler.execute(
      new ApproveCommitCommand('')
    );
    expect(result.isFailure).toBe(true);
  });
});