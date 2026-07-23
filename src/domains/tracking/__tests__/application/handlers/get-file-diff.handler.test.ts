import { GetFileDiffHandler } from '../../../application/handlers/get-file-diff.handler';
import { GetFileDiffQuery } from '../../../application/queries/get-file-diff.query';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';

describe('GetFileDiffHandler', () => {
  let handler: GetFileDiffHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn(),
      saveHash: jest.fn(),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
      deleteAllExcept: jest.fn(),
    } as any;

    handler = new GetFileDiffHandler(mockHashRepo);
  });

  it('should return the diff DTO when found', async () => {
    const mockDiff = {
      filePath: 'src/app.ts',
      oldHash: 'a'.repeat(64),
      newHash: 'b'.repeat(64),
      addedLines: [],
      removedLines: [],
      modifiedLines: [],
    };
    mockHashRepo.findDiffByPath.mockResolvedValue(mockDiff);

    const result = await handler.execute(new GetFileDiffQuery('src/app.ts'));
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(mockDiff);
  });

  it('should return null when no diff exists', async () => {
    mockHashRepo.findDiffByPath.mockResolvedValue(null);
    const result = await handler.execute(new GetFileDiffQuery('nonexistent.ts'));
    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('should return failure on repository error', async () => {
    mockHashRepo.findDiffByPath.mockRejectedValue(new Error('IO error'));
    const result = await handler.execute(new GetFileDiffQuery('any'));
    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('IO error');
  });
});