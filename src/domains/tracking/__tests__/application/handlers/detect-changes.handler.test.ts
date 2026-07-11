import { DetectChangesHandler } from '../../../application/handlers/detect-changes.handler';
import { DetectChangesCommand } from '../../../application/commands/detect-changes.command';
import { IFileContentReader } from '../../../application/ports/file-content-reader.interface';
import { ITrackingRepository } from '../../../domain/repository/tracking-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { EventBus } from '../../../../shared-kernel/events/event-bus';

describe('DetectChangesHandler', () => {
  let handler: DetectChangesHandler;
  let mockReader: jest.Mocked<IFileContentReader>;
  let mockRepo: jest.Mocked<ITrackingRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;

  beforeEach(() => {
    mockReader = {
      readContent: jest.fn().mockResolvedValue('const x = 1;'),
    };

    mockRepo = {
      findHashByPath: jest.fn().mockResolvedValue(null),
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

    handler = new DetectChangesHandler(mockReader, mockRepo, mockLinkedDocQuery);
    EventBus.getInstance().clear();
  });

  afterEach(() => {
    EventBus.getInstance().clear();
  });

  it('should read content and record hash for new file', async () => {
    const result = await handler.execute(
      new DetectChangesCommand('src/app.ts')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockReader.readContent).toHaveBeenCalledWith('src/app.ts');
    expect(mockRepo.saveHash).toHaveBeenCalledTimes(1);
  });

  it('should detect changes when content differs', async () => {
    mockReader.readContent.mockResolvedValue('const x = 2;');

    const existingHash = require('crypto').createHash('sha256')
      .update('const x = 1;'.replace(/\r\n/g, '\n'), 'utf-8')
      .digest('hex');

    const { FileHash } = require('../../../domain/entities/file-hash');
    const { FileHashId } = require('../../../domain/value-objects/file-hash-id');
    const { FilePath } = require('../../../../filesystem/domain/value-objects/file-path');
    const { HashValue } = require('../../../domain/value-objects/hash-value');

    mockRepo.findHashByPath.mockResolvedValue(
      new FileHash(
        new FileHashId('fh-1'),
        new FilePath('src/app.ts'),
        new HashValue(existingHash)
      )
    );

    const result = await handler.execute(
      new DetectChangesCommand('src/app.ts')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockRepo.saveHash).toHaveBeenCalledTimes(1);
  });

  it('should return failure when content reader fails', async () => {
    mockReader.readContent.mockRejectedValue(new Error('File not found'));

    const result = await handler.execute(
      new DetectChangesCommand('src/missing.ts')
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('File not found');
  });

  it('should return failure when file path is invalid', async () => {
    const result = await handler.execute(
      new DetectChangesCommand('')
    );
    expect(result.isFailure).toBe(true);
  });
});