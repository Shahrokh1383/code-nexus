import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ApproveCommitCommand } from '../commands/approve-commit.command';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { IBaselineDiffCacheRepository } from '../../domain/repository/baseline-diff-cache-repository.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';
import { CommitApprovedEvent } from '../../domain/events/commit-approved';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';

export class ApproveCommitHandler implements ICommandHandler<ApproveCommitCommand, void> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly cacheRepo: IBaselineDiffCacheRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(command: ApproveCommitCommand): Promise<Result<void, string>> {
    try {
      const documentId = new DocumentId(command.documentId);
      const linkedFilePaths = await this.linkedDocQuery.findLinkedFiles(documentId.value);

      const filePaths: TrackedFilePath[] = [];

      for (const filePathStr of linkedFilePaths) {
        const filePath = new TrackedFilePath(filePathStr);
        const existing = await this.hashRepo.findHashByPath(filePath);
        if (!existing) {
          return Result.fail(`No hash record found for file: ${filePathStr}`);
        }

        // Mark as committed and clear pending status
        await this.hashRepo.updatePendingStatus(filePath, false, existing.hashValue.value);
        // Clear baseline and diff cache
        await this.cacheRepo.clearCacheForFile(filePathStr);
        filePaths.push(filePath);
      }

      const commitId = new CommitId(UuidGenerator.generate()); // placeholder for event
      await EventBus.getInstance().emit(new CommitApprovedEvent(commitId, documentId, filePaths));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to approve commit');
    }
  }
}