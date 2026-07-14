import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ApproveCommitCommand } from '../commands/approve-commit.command';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitStatus } from '../../domain/value-objects/commit-status';
import { CommitApprovedEvent } from '../../domain/events/commit-approved';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { FileContentReaderAdapter } from '../../infrastructure/adapters/file-content-reader.adapter';

export class ApproveCommitHandler implements ICommandHandler<ApproveCommitCommand, void> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly commitRepo: ICommitRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort,
    private readonly contentReader: IFileContentReader
  ) {}

  async execute(command: ApproveCommitCommand): Promise<Result<void, string>> {
    try {
      const documentId = new DocumentId(command.documentId);
      const linkedFilePaths = await this.linkedDocQuery.findLinkedFiles(documentId.value);
      const allHashes = await this.hashRepo.findAllHashes();
      const pendingLinkedHashes = allHashes.filter((h) => {
        const isLinked = linkedFilePaths.includes(h.filePath.value);
        const isPending = h.commitId.isNone || h.committedAt.isNone;
        return isLinked && isPending;
      });

      if (pendingLinkedHashes.length === 0) return Result.ok(undefined);

      const commitId = new CommitId(UuidGenerator.generate());
      for (const hash of pendingLinkedHashes) {
        hash.commit(commitId);
        await this.hashRepo.saveHash(hash);

        const content = await this.contentReader.readContent(hash.filePath.value);
        const adapter = this.contentReader as FileContentReaderAdapter;
        await FileContentReaderAdapter.saveBaseline(adapter.workspaceRoot, hash.filePath.value, content);
      }

      const commit = new GranularCommit(
        commitId,
        documentId,
        pendingLinkedHashes,
        DateTime.now(),
        CommitStatus.approved()
      );

      await this.commitRepo.save(commit);
      await EventBus.getInstance().emit(new CommitApprovedEvent(commitId, documentId, commit.getLinkedFiles()));

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve commit';
      return Result.fail(message);
    }
  }
}