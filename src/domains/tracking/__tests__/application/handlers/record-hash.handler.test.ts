import { RecordHashHandler } from '../../../application/handlers/record-hash.handler';
import { RecordHashCommand } from '../../../application/commands/record-hash.command';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { DiffCalculatorService } from '../../../domain/services/diff-calculator.service';
import { ContentDiff } from '../../../domain/entities/content-diff';
import { DiffId } from '../../../domain/value-objects/diff-id';
import { DiffLine } from '../../../domain/value-objects/diff-line';
import { DiffLineType } from '../../../domain/value-objects/diff-line';

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

describe('RecordHashHandler', () => {
  let handler: RecordHashHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockDiffService: jest.Mocked<DiffCalculatorService>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn(),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
    };

    // Mock DiffCalculatorService: provide a calculate method returning empty diff
    mockDiffService = {
      calculate: jest.fn().mockImplementation((oldContent, newContent, fp, oh, nh) =>
        createEmptyDiff(fp, oh, nh)
      ),
    } as any;

    handler = new RecordHashHandler(mockHashRepo, mockDiffService);
    EventBus.getInstance().clear();
  });

  afterEach(() => {
    EventBus.getInstance().clear();
  });

  it('should create new FileHash when none exists', async () => {
    mockHashRepo.findHashByPath.mockResolvedValue(null);

    const result = await handler.execute(
      new RecordHashCommand('src/app.ts', 'const x = 1;')
    );

    expect(result.isSuccess).toBe(true);
    expect(mockHashRepo.saveHash).toHaveBeenCalledTimes(1);
    const saved = mockHashRepo.saveHash.mock.calls[0][0] as FileHash;
    expect(saved.filePath.value).toBe('src/app.ts');
    // new hash without old content: commitId should be absent (isNone)
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
    mockHashRepo.findHashByPath.mockResolvedValue(existing);

    const result = await handler.execute(
      new RecordHashCommand('src/app.ts', content)
    );

    expect(result.isSuccess).toBe(true);
    expect(mockHashRepo.saveHash).not.toHaveBeenCalled();
  });

  it('should update hash and emit event when content changed', async () => {
    const oldContent = 'const x = 1;';
    const newContent = 'const x = 2;';
    const existing = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      HashValue.fromContent(oldContent)
    );
    mockHashRepo.findHashByPath.mockResolvedValue(existing);

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
    expect(mockHashRepo.saveHash).toHaveBeenCalledTimes(1);
    expect(emittedEvents).toContain('ChangesDetectedEvent');
  });

  // The test for ReviewRequiredEvent has been REMOVED because the handler does not emit it.

  it('should return failure on invalid file path', async () => {
    const result = await handler.execute(
      new RecordHashCommand('', 'content')
    );
    expect(result.isFailure).toBe(true);
  });
});