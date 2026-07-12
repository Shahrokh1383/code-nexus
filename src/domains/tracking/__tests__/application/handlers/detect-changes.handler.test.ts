import { DetectChangesHandler } from '../../../application/handlers/detect-changes.handler';
import { DetectChangesCommand } from '../../../application/commands/detect-changes.command';
import { IFileContentReader } from '../../../application/ports/file-content-reader.interface';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';
import { DiffCalculatorService } from '../../../domain/services/diff-calculator.service';
import { ContentDiff } from '../../../domain/entities/content-diff';
import { DiffId } from '../../../domain/value-objects/diff-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { EventBus } from '../../../../shared-kernel/events/event-bus';

// Helper to create an empty ContentDiff
const createEmptyDiff = (filePath: FilePath, oldHash: HashValue, newHash: HashValue): ContentDiff =>
  new ContentDiff(
    new DiffId('diff-id'),
    filePath,
    oldHash,
    newHash,
    [],
    [],
    []
  );

describe('DetectChangesHandler', () => {
  let handler: DetectChangesHandler;
  let mockReader: jest.Mocked<IFileContentReader>;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockDiffService: jest.Mocked<DiffCalculatorService>;

  beforeEach(() => {
    mockReader = {
      readContent: jest.fn().mockResolvedValue('const x = 1;'),
      getPreviousContent: jest.fn().mockResolvedValue(null),
      updateCache: jest.fn(),
    };

    mockHashRepo = {
      findHashByPath: jest.fn().mockResolvedValue(null),
      findAllHashes: jest.fn(),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
    };

    // Mock DiffCalculatorService: calculate returns empty diff
    mockDiffService = {
      calculate: jest.fn().mockImplementation((oldContent, newContent, fp, oh, nh) =>
        createEmptyDiff(fp, oh, nh)
      ),
    } as any;

    handler = new DetectChangesHandler(mockReader, mockHashRepo, mockDiffService);
    EventBus.getInstance().clear();
  });

  afterEach(() => {
    EventBus.getInstance().clear();
  });

  it('should read content and record hash for new file', async () => {
    // getPreviousContent returns null → oldContent will be null (no diff)
    mockReader.getPreviousContent.mockResolvedValue(null);

    const result = await handler.execute(
      new DetectChangesCommand('src/app.ts')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockReader.readContent).toHaveBeenCalledWith('src/app.ts');
    expect(mockHashRepo.saveHash).toHaveBeenCalledTimes(1);
    expect(mockReader.updateCache).toHaveBeenCalledWith('src/app.ts', 'const x = 1;');
  });

  it('should detect changes when content differs', async () => {
    mockReader.readContent.mockResolvedValue('const x = 2;');
    // Return old content to trigger diff and update
    mockReader.getPreviousContent.mockResolvedValue('const x = 1;');

    const existingHash = require('crypto').createHash('sha256')
      .update('const x = 1;'.replace(/\r\n/g, '\n'), 'utf-8')
      .digest('hex');

    const { FileHash } = require('../../../domain/entities/file-hash');
    const { FileHashId } = require('../../../domain/value-objects/file-hash-id');
    const { FilePath } = require('../../../../filesystem/domain/value-objects/file-path');
    const { HashValue } = require('../../../domain/value-objects/hash-value');

    mockHashRepo.findHashByPath.mockResolvedValue(
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
    expect(mockHashRepo.saveHash).toHaveBeenCalledTimes(1);
    expect(mockReader.updateCache).toHaveBeenCalledWith('src/app.ts', 'const x = 2;');
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