import { DetectChangesHandler } from '../../../application/handlers/detect-changes.handler';
import { DetectChangesCommand } from '../../../application/commands/detect-changes.command';
import { IFileContentReader } from '../../../application/ports/file-content-reader.interface';
import { RecordHashHandler } from '../../../application/handlers/record-hash.handler';
import { RecordHashCommand } from '../../../application/commands/record-hash.command';
import { Result } from '../../../../shared-kernel/types/result';

describe('DetectChangesHandler', () => {
  let handler: DetectChangesHandler;
  let mockReader: jest.Mocked<IFileContentReader>;
  let mockRecordHashHandler: jest.Mocked<RecordHashHandler>;

  beforeEach(() => {
    mockReader = {
      readContent: jest.fn(),
      getPreviousContent: jest.fn(),
      updateCache: jest.fn(),
      getWorkspaceRoot: jest.fn().mockReturnValue('/test/workspace'),
    };

    // Mock the delegated handler
    mockRecordHashHandler = {
      execute: jest.fn(),
    } as any;

    // Inject the exact 2 dependencies required by the SRP-compliant handler
    handler = new DetectChangesHandler(mockReader, mockRecordHashHandler);
  });

  it('should read content, delegate to RecordHashHandler, and update cache for new file', async () => {
    mockReader.readContent.mockResolvedValue('const x = 1;');
    mockReader.getPreviousContent.mockResolvedValue(null);
    mockRecordHashHandler.execute.mockResolvedValue(Result.ok(undefined));

    const result = await handler.execute(new DetectChangesCommand('src/app.ts'));

    expect(result.isSuccess).toBe(true);
    expect(mockReader.readContent).toHaveBeenCalledWith('src/app.ts');
    expect(mockReader.getPreviousContent).toHaveBeenCalledWith('src/app.ts');
    
    // Verify delegation to RecordHashHandler
    expect(mockRecordHashHandler.execute).toHaveBeenCalledTimes(1);
    const passedCommand = mockRecordHashHandler.execute.mock.calls[0][0] as RecordHashCommand;
    expect(passedCommand).toBeInstanceOf(RecordHashCommand);
    expect(passedCommand.filePath).toBe('src/app.ts');
    expect(passedCommand.newContent).toBe('const x = 1;');
    expect(passedCommand.oldContent).toBeNull();

    // Verify cache update
    expect(mockReader.updateCache).toHaveBeenCalledWith('src/app.ts', 'const x = 1;');
  });

  it('should read content, delegate with old content, and update cache when content differs', async () => {
    mockReader.readContent.mockResolvedValue('const x = 2;');
    mockReader.getPreviousContent.mockResolvedValue('const x = 1;');
    mockRecordHashHandler.execute.mockResolvedValue(Result.ok(undefined));

    const result = await handler.execute(new DetectChangesCommand('src/app.ts'));

    expect(result.isSuccess).toBe(true);
    
    expect(mockRecordHashHandler.execute).toHaveBeenCalledTimes(1);
    const passedCommand = mockRecordHashHandler.execute.mock.calls[0][0] as RecordHashCommand;
    expect(passedCommand.filePath).toBe('src/app.ts');
    expect(passedCommand.newContent).toBe('const x = 2;');
    expect(passedCommand.oldContent).toBe('const x = 1;');

    expect(mockReader.updateCache).toHaveBeenCalledWith('src/app.ts', 'const x = 2;');
  });

  it('should return failure and not update cache when RecordHashHandler fails', async () => {
    mockReader.readContent.mockResolvedValue('const x = 1;');
    mockReader.getPreviousContent.mockResolvedValue(null);
    mockRecordHashHandler.execute.mockResolvedValue(Result.fail('Hash recording failed'));

    const result = await handler.execute(new DetectChangesCommand('src/app.ts'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('Hash recording failed');
    expect(mockReader.updateCache).not.toHaveBeenCalled();
  });

  it('should return failure when content reader fails', async () => {
    mockReader.readContent.mockRejectedValue(new Error('File not found'));

    const result = await handler.execute(new DetectChangesCommand('src/missing.ts'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('File not found');
    expect(mockRecordHashHandler.execute).not.toHaveBeenCalled();
    expect(mockReader.updateCache).not.toHaveBeenCalled();
  });
});