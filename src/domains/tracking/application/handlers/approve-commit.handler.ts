import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { ApproveCommitCommand } from '../commands/approve-commit.command';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { CommitId } from '../../domain/value-objects/commit-id';
import { GranularCommit } from '../../domain/entities/granular-commit';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { HashValue } from '../../domain/value-objects/hash-value';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { CommitApprovedEvent } from '../../domain/events/commit-approved';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { CommitMatcherService } from '../../domain/services/commit-matcher.service';
import { DocumentCommitApproval } from '../../domain/entities/document-commit-approval';

export class ApproveCommitHandler implements ICommandHandler<ApproveCommitCommand, void> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly commitRepo: ICommitRepository,
    private readonly approvalRepo: IDocumentCommitApprovalRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort,
    private readonly contentReader: IFileContentReader,
    private readonly commitMatcher: CommitMatcherService
  ) {}

  async execute(command: ApproveCommitCommand): Promise<Result<void, string>> {
    try {
      const documentId = new DocumentId(command.documentId);
      const linkedFilePaths = await this.linkedDocQuery.findLinkedFiles(documentId.value);

      const currentHashMap = new Map<string, HashValue>();
      const fileHashEntities: FileHash[] = [];

      for (const filePathStr of linkedFilePaths) {
        const filePath = new FilePath(filePathStr);
        const existing = await this.hashRepo.findHashByPath(filePath);
        if (!existing) return Result.fail(`No hash record found for file: ${filePathStr}`);
        
        currentHashMap.set(filePathStr, existing.hashValue);
        fileHashEntities.push(new FileHash(new FileHashId(UuidGenerator.generate()), filePath, existing.hashValue));
      }

      let commit = await this.commitMatcher.findMatchingCommit(currentHashMap, this.commitRepo);
      if (!commit) {
        commit = new GranularCommit(new CommitId(UuidGenerator.generate()), fileHashEntities, DateTime.now());
        await this.commitRepo.save(commit);
      }

      for (const filePathStr of linkedFilePaths) {
        const content = await this.contentReader.readContent(filePathStr);
        await this.contentReader.saveBaseline(filePathStr, content);
      }

      const approval = new DocumentCommitApproval(documentId, commit.id, DateTime.now());
      await this.approvalRepo.save(approval);
      await EventBus.getInstance().emit(new CommitApprovedEvent(commit.id, documentId, commit.getLinkedFiles()));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to approve commit');
    }
  }
}