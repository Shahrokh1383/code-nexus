import { ApproveCommitHandler } from '../../../application/handlers/approve-commit.handler';
import { ApproveCommitCommand } from '../../../application/commands/approve-commit.command';
import { IHashRepository } from '../../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../../domain/repository/document-commit-approval-repository.interface';
import { ILinkedDocumentQueryPort } from '../../../application/ports/linked-document-query.port';
import { IFileContentReader } from '../../../application/ports/file-content-reader.interface';
import { CommitMatcherService } from '../../../domain/services/commit-matcher.service';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { FileHash } from '../../../domain/entities/file-hash';
import { FileHashId } from '../../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../../domain/value-objects/hash-value';
import { FileContentReaderAdapter } from '../../../infrastructure/adapters/file-content-reader.adapter';

describe('ApproveCommitHandler', () => {
  let handler: ApproveCommitHandler;
  let mockHashRepo: jest.Mocked<IHashRepository>;
  let mockCommitRepo: jest.Mocked<ICommitRepository>;
  let mockApprovalRepo: jest.Mocked<IDocumentCommitApprovalRepository>;
  let mockLinkedDocQuery: jest.Mocked<ILinkedDocumentQueryPort>;
  let mockContentReader: jest.Mocked<IFileContentReader>;
  let mockCommitMatcher: jest.Mocked<CommitMatcherService>;

  beforeEach(() => {
    mockHashRepo = {
      findHashByPath: jest.fn(),
      findAllHashes: jest.fn().mockResolvedValue([]),
      saveHash: jest.fn().mockResolvedValue(undefined),
      findDiffByPath: jest.fn(),
      deleteHashByPath: jest.fn(),
      deleteAllExcept: jest.fn(),
    } as any;

    mockCommitRepo = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
    } as any;

    mockApprovalRepo = {
      findByDocument: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockLinkedDocQuery = {
      findLinkedDocuments: jest.fn().mockResolvedValue([]),
      findLinkedFiles: jest.fn().mockResolvedValue([]),
    } as any;

    mockContentReader = {
      readContent: jest.fn().mockResolvedValue('file content'),
      getPreviousContent: jest.fn(),
      updateCache: jest.fn(),
      getWorkspaceRoot: jest.fn().mockReturnValue('/test/workspace'),
    } as any;
    
    // The handler casts the reader to access the workspaceRoot property directly
    (mockContentReader as any).workspaceRoot = '/test/workspace';

    mockCommitMatcher = {
      findMatchingCommit: jest.fn(),
    } as any;

    // Inject ALL 6 required dependencies
    handler = new ApproveCommitHandler(
      mockHashRepo, 
      mockCommitRepo, 
      mockApprovalRepo, 
      mockLinkedDocQuery, 
      mockContentReader, 
      mockCommitMatcher
    );
    
    EventBus.getInstance().clear();
    jest.spyOn(FileContentReaderAdapter, 'saveBaseline').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    EventBus.getInstance().clear();
    jest.restoreAllMocks();
  });

  it('should approve commit for linked hashes', async () => {
    const existingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    
    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts']);
    mockHashRepo.findHashByPath.mockResolvedValue(existingHash);
    mockCommitMatcher.findMatchingCommit.mockResolvedValue(null); // Force creation of new commit

    const emittedEvents: string[] = [];
    EventBus.getInstance().register('CommitApprovedEvent', {
      handle: async (event) => {
        emittedEvents.push(event.eventType);
      },
    });

    const result = await handler.execute(new ApproveCommitCommand('doc-1'));

    expect(result.isSuccess).toBe(true);
    
    // A new commit should be created and saved
    expect(mockCommitRepo.save).toHaveBeenCalledTimes(1);
    
    // An approval record must be saved
    expect(mockApprovalRepo.save).toHaveBeenCalledTimes(1);
    
    // Baselines must be saved via the static adapter method
    expect(FileContentReaderAdapter.saveBaseline).toHaveBeenCalledWith('/test/workspace', 'src/app.ts', 'file content');
    
    expect(emittedEvents).toContain('CommitApprovedEvent');
  });

  it('should use existing matching commit if found', async () => {
    const existingHash = new FileHash(
      new FileHashId('fh-1'),
      new FilePath('src/app.ts'),
      new HashValue('a'.repeat(64))
    );
    
    const { GranularCommit } = require('../../../domain/entities/granular-commit');
    const { CommitId } = require('../../../domain/value-objects/commit-id');
    const { DateTime } = require('../../../../shared-kernel/types/date-time');
    
    const existingCommit = new GranularCommit(
      new CommitId('existing-commit'),
      [existingHash],
      DateTime.now()
    );

    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/app.ts']);
    mockHashRepo.findHashByPath.mockResolvedValue(existingHash);
    mockCommitMatcher.findMatchingCommit.mockResolvedValue(existingCommit);

    const result = await handler.execute(new ApproveCommitCommand('doc-1'));

    expect(result.isSuccess).toBe(true);
    
    // No new commit should be created
    expect(mockCommitRepo.save).not.toHaveBeenCalled();
    
    // But approval must still be saved
    expect(mockApprovalRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should return failure if hash record is missing for a linked file', async () => {
    mockLinkedDocQuery.findLinkedFiles.mockResolvedValue(['src/missing.ts']);
    mockHashRepo.findHashByPath.mockResolvedValue(null);

    const result = await handler.execute(new ApproveCommitCommand('doc-1'));

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toContain('No hash record found for file: src/missing.ts');
    expect(mockCommitRepo.save).not.toHaveBeenCalled();
    expect(mockApprovalRepo.save).not.toHaveBeenCalled();
  });

  it('should return failure on invalid documentId', async () => {
    const result = await handler.execute(new ApproveCommitCommand(''));
    expect(result.isFailure).toBe(true);
  });
});