import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetCommitHistoryQuery } from '../queries/get-commit-history.query';
import { GranularCommitDto } from '../dto/granular-commit.dto';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

export class GetCommitHistoryHandler implements IQueryHandler<GetCommitHistoryQuery, GranularCommitDto[]> {
  constructor(private readonly repository: ITrackingRepository) {}

  async execute(query: GetCommitHistoryQuery): Promise<Result<GranularCommitDto[], string>> {
    try {
      const documentId = new DocumentId(query.documentId);
      const commits = await this.repository.findCommitsByDocument(documentId);

      const approvedCommits = commits
        .filter((c) => c.status.isApproved)
        .sort((a, b) => b.committedAt.toISO().localeCompare(a.committedAt.toISO()));

      const dtos: GranularCommitDto[] = approvedCommits.map((c) => ({
        id: c.id.value,
        documentId: c.documentId.value,
        filePaths: c.getLinkedFiles().map((p) => p.value),
        committedAt: c.committedAt.toISO(),
        status: c.status.toString(),
      }));

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get commit history';
      return Result.fail(message);
    }
  }
}