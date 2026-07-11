import { RecordHashHandler } from '../../../application/handlers/record-hash.handler';
import { RecordHashCommand } from '../../../application/commands/record-hash.command';
import { ITrackingRepository } from '../../../domain/repository/tracking-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { DocumentId } from '../../../../documentation/domain/value-objects/document-id';
import { Maybe } from '../../../../shared-kernel/types/maybe';

describe('RecordHashHandler', () => {
  let handler: RecordHashHandler;
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

    handler = new RecordHashHandler(mockRepo, mockLinkedDocQuery);
    EventBus.getInstance().clear();
  });

  afterEach(() => {
    EventBus.getInstance().clear();
  });

  it('should create new FileHash when none exists', async () => {
    mockRepo.findHashByPath.mockResolvedValue(null);

    const result = await handler.execute(
      new RecordHashCommand('src/app.ts', 'const x = 1;')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.saveHash).toHaveBeenCalledTimes(1);
    const saved = mockRepo.saveHash.mock.calls[0][0] as FileHash;
    expect(saved.filePath.value).toBe('src/app.ts');
    expect(saved.commitId.isNone).toBe(true);
  });

  it('should not save when hash is unchanged', async () => {
    const content = 'const x = 1;';
    const hash = HashValue.fromContent(content);
    const existing = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      hash
    );
    mockRepo.findHashByPath.mockResolvedValue(existing);

    const result = await handler.execute(
      new RecordHashCommand('src/app.ts', content)
    );

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.saveHash).not.toHaveBeenCalled();
  });

  it('should update hash and emit event when content changed', async () => {
    const oldContent = 'const x = 1;';
    const newContent = 'const x = 2;';
    const existing = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      HashValue.fromContent(oldContent)
    );
    mockRepo.findHashByPath.mockResolvedValue(existing);

    const emittedEvents: string[] = [];
    EventBus.getInstance().register('ChangesDetectedEvent', {
      handle: async (event) => {
        emittedEvents.push(event.eventType);
      },
    });

    const result = await handler.execute(
      new RecordHashCommand('src/app.ts', newContent)
    );

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.saveHash).toHaveBeenCalledTimes(1);
    expect(emittedEvents).toContain('ChangesDetectedEvent');
  });

  it('should emit ReviewRequiredEvent for linked documents', async () => {
    const oldContent = 'const x = 1;';
    const newContent = 'const x = 2;';
    const existing = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      HashValue.fromContent(oldContent)
    );
    mockRepo.findHashByPath.mockResolvedValue(existing);
    mockLinkedDocQuery.findLinkedDocuments.mockResolvedValue([
      new DocumentId('doc-1'),
      new DocumentId('doc-2'),
    ]);

    const reviewEvents: string[] = [];
    EventBus.getInstance().register('ReviewRequiredEvent', {
      handle: async (event) => {
        reviewEvents.push(event.eventType);
      },
    });

    await handler.execute(new RecordHashCommand('src/app.ts', newContent));

    expect(reviewEvents.length).toBe(2);
    expect(mockLinkedDocQuery.findLinkedDocuments).toHaveBeenCalledWith('src/app.ts');
  });

  it('should return failure on invalid file path', async () => {
    const result = await handler.execute(
      new RecordHashCommand('', 'content')
    );
    expect(result.isFailure).toBe(true);
  });
});