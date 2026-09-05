import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetPendingChangesQuery } from '../queries/get-pending-changes.query';
import { FileHashDto } from '../dto/file-hash.dto';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';

export class GetPendingChangesHandler implements IQueryHandler<GetPendingChangesQuery, FileHashDto[]> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly commitRepo: ICommitRepository,
    private readonly approvalRepo: IDocumentCommitApprovalRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(query: GetPendingChangesQuery): Promise<Result<FileHashDto[], string>> {
    try {
      if (!query.documentId) {
        return Result.ok([]);
      }

      const documentId = new DocumentId(query.documentId);
      const linkedFiles = await this.linkedDocQuery.findLinkedFiles(documentId.value);
      const approvals = await this.approvalRepo.findByDocument(documentId);
      const latestApproval = approvals.length > 0 ? approvals[approvals.length - 1] : null;

      if (!latestApproval) {
        const result: FileHashDto[] = [];
        for (const filePathStr of linkedFiles) {
          const hash = await this.hashRepo.findHashByPath(new TrackedFilePath(filePathStr));
          if (hash) {
            result.push({
              filePath: hash.filePath.value,
              hashValue: hash.hashValue.value,
              committedAt: null,
              status: 'PENDING'
            });
          }
        }
        return Result.ok(result);
      }

      const commit = await this.commitRepo.findById(latestApproval.commitId);
      if (!commit) {
        return Result.fail('Approved commit not found');
      }

      const result: FileHashDto[] = [];
      for (const filePathStr of linkedFiles) {
        const currentHash = await this.hashRepo.findHashByPath(new TrackedFilePath(filePathStr));
        if (!currentHash) continue;

        const committedHash = commit.fileHashes.find(fh => fh.filePath.value === filePathStr);
        const isPending = !committedHash || !currentHash.hashValue.equals(committedHash.hashValue);
        if (isPending) {
          result.push({
            filePath: currentHash.filePath.value,
            hashValue: currentHash.hashValue.value,
            committedAt: committedHash ? commit.committedAt.toISO() : null,
            status: 'PENDING'
          });
        }
      }
      return Result.ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get pending changes';
      return Result.fail(message);
    }
  }
}