import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetCommitHistoryQuery } from '../queries/get-commit-history.query';
import { GranularCommitDto } from '../dto/granular-commit.dto';
import { ICommitRepository } from '../../domain/repository/commit-repository.interface';
import { IDocumentCommitApprovalRepository } from '../../domain/repository/document-commit-approval-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

export class GetCommitHistoryHandler implements IQueryHandler<GetCommitHistoryQuery, GranularCommitDto[]> {
  constructor(
    private readonly commitRepo: ICommitRepository,
    private readonly approvalRepo: IDocumentCommitApprovalRepository
  ) {}

  async execute(query: GetCommitHistoryQuery): Promise<Result<GranularCommitDto[], string>> {
    try {
      const documentId = new DocumentId(query.documentId);
      const approvals = await this.approvalRepo.findByDocument(documentId);
      const dtos: GranularCommitDto[] = [];

      for (const approval of approvals) {
        const commit = await this.commitRepo.findById(approval.commitId);
        if (commit) {
          dtos.push({
            id: commit.id.value,
            documentId: documentId.value,
            filePaths: commit.getLinkedFiles().map(p => p.value),
            committedAt: commit.committedAt.toISO(),
            status: 'APPROVED' // all approvals are approved
          });
        }
      }

      dtos.sort((a, b) => b.committedAt.localeCompare(a.committedAt));
      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get commit history';
      return Result.fail(message);
    }
  }
}