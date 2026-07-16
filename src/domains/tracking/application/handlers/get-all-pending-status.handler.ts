import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetAllPendingStatusQuery } from '../queries/get-all-pending-status.query';
import { PendingStatusDto } from '../dto/pending-status.dto';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { DocumentCommitApproval } from '../../domain/entities/document-commit-approval';
import { GranularCommit } from '../../domain/entities/granular-commit';

export class GetAllPendingStatusHandler implements IQueryHandler<GetAllPendingStatusQuery, PendingStatusDto[]> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly commitRepo: ICommitRepository,
    private readonly approvalRepo: IDocumentCommitApprovalRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(_query: GetAllPendingStatusQuery): Promise<Result<PendingStatusDto[], string>> {
    try {
      const allHashes = await this.hashRepo.findAllHashes();
      const approvalsCache = new Map<string, DocumentCommitApproval[] | null>();
      const commitCache = new Map<string, GranularCommit | null>();
      const countMap: Record<string, number> = {};

      for (const hash of allHashes) {
        const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(hash.filePath.value);
        for (const docId of linkedDocs) {
          const key = docId.value;
          if (!approvalsCache.has(key)) {
            approvalsCache.set(key, await this.approvalRepo.findByDocument(docId));
          }
          const approvals = approvalsCache.get(key)!;
          const latest = approvals.length > 0 ? approvals[approvals.length - 1] : null;

          if (!latest) {
            countMap[key] = (countMap[key] || 0) + 1;
            continue;
          }

          const commitId = latest.commitId.value;
          if (!commitCache.has(commitId)) {
            commitCache.set(commitId, await this.commitRepo.findById(latest.commitId));
          }
          const commit = commitCache.get(commitId);
          if (!commit) {
            countMap[key] = (countMap[key] || 0) + 1;
            continue;
          }

          const committedHash = commit.fileHashes.find(fh => fh.filePath.value === hash.filePath.value);
          if (!committedHash || !hash.hashValue.equals(committedHash.hashValue)) {
            countMap[key] = (countMap[key] || 0) + 1;
          }
        }
      }

      const dtos: PendingStatusDto[] = Object.entries(countMap).map(([documentId, pendingCount]) => ({
        documentId,
        pendingCount
      }));

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get pending status';
      return Result.fail(message);
    }
  }
}