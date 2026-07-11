import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ApproveCommitCommand } from '../commands/approve-commit.command';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../domain/value-objects/commit-status';
import { CommitApprovedEvent } from '../../domain/events/commit-approved';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';

export class ApproveCommitHandler implements ICommandHandler<ApproveCommitCommand, void> {
  constructor(
    private readonly repository: ITrackingRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(command: ApproveCommitCommand): Promise<Result<void, string>> {
    try {
      const documentId = new DocumentId(command.documentId);
      
      const linkedFilePaths = await this.linkedDocQuery.findLinkedFiles(documentId.value);
      
      const allHashes = await this.repository.findAllHashes();
      const pendingLinkedHashes = allHashes.filter((h) => {
        const isLinked = linkedFilePaths.includes(h.filePath.value);
        const isPending = h.commitId.isNone || h.committedAt.isNone;
        return isLinked && isPending;
      });

      if (pendingLinkedHashes.length === 0) {
        return Result.ok(undefined);
      }

      const commitId = new CommitId(UuidGenerator.generate());
      for (const hash of pendingLinkedHashes) {
        hash.commit(commitId);
        await this.repository.saveHash(hash);
      }

      const commit = new GranularCommit(
        commitId,
        documentId,
        pendingLinkedHashes,
        DateTime.now(),
        CommitStatus.approved()
      );

      await this.repository.saveCommit(commit);

      await EventBus.getInstance().emit(
        new CommitApprovedEvent(commitId, documentId, commit.getLinkedFiles())
      );

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve commit';
      return Result.fail(message);
    }
  }
}