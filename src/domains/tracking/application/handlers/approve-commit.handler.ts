import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ApproveCommitCommand } from '../commands/approve-commit.command';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { IBaselineDiffCacheRepository } from '../../domain/repository/baseline-diff-cache-repository.interface';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { DocumentCommitApproval } from '../../domain/entities/document-commit-approval';
import { CommitApprovedEvent } from '../../domain/events/commit-approved';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class ApproveCommitHandler implements ICommandHandler<ApproveCommitCommand, void> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly cacheRepo: IBaselineDiffCacheRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort,
    private readonly commitRepo: ICommitRepository,
    private readonly approvalRepo: IDocumentCommitApprovalRepository,
    private readonly contentReader: IFileContentReader
  ) {}

  async execute(command: ApproveCommitCommand): Promise<Result<void, string>> {
    try {
      const documentId = new DocumentId(command.documentId);
      const linkedFilePaths = await this.linkedDocQuery.findLinkedFiles(documentId.value);

      if (linkedFilePaths.length === 0) {
        return Result.fail('No linked files found for the selected document');
      }

      const filePaths: TrackedFilePath[] = [];
      const fileHashesForCommit = [];

      for (const filePathStr of linkedFilePaths) {
        const filePath = new TrackedFilePath(filePathStr);
        const existing = await this.hashRepo.findHashByPath(filePath);
        if (!existing) {
          return Result.fail(`No hash record found for file: ${filePathStr}`);
        }

        // Snapshot current content as the new baseline so future diffs are
        // computed against the committed state (git-like), not an empty file.
        const currentContent = await this.contentReader.readContent(filePathStr);

        // Mark as committed and clear pending status
        await this.hashRepo.updatePendingStatus(filePath, false, existing.hashValue.value);
        // Reset cache, then re-seed the baseline.
        await this.cacheRepo.clearCacheForFile(filePathStr);
        await this.cacheRepo.saveBaseline(filePathStr, currentContent);
        filePaths.push(filePath);
        fileHashesForCommit.push(existing);
      }

      const commitId = new CommitId(UuidGenerator.generate());
      const committedAt = DateTime.now();

      // Persist granular commit
      const commit = new GranularCommit(commitId, fileHashesForCommit, committedAt);
      await this.commitRepo.save(commit);

      // Persist document-commit approval
      const approval = new DocumentCommitApproval(documentId, commitId, committedAt);
      await this.approvalRepo.save(approval);

      await EventBus.getInstance().emit(new CommitApprovedEvent(commitId, documentId, filePaths));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to approve commit');
    }
  }
}