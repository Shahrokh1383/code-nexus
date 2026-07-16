import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetAllPendingStatusQuery } from '../queries/get-all-pending-status.query';
import { PendingStatusDto } from '../dto/pending-status.dto';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';

export class GetAllPendingStatusHandler implements IQueryHandler<GetAllPendingStatusQuery, PendingStatusDto[]> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(_query: GetAllPendingStatusQuery): Promise<Result<PendingStatusDto[], string>> {
    try {
      const allHashes = await this.hashRepo.findAllHashes();
      const pendingHashes = allHashes.filter(h => h.commitId.isNone);

      // Aggregate pending files per document
      const countMap: Record<string, number> = {};
      for (const hash of pendingHashes) {
        const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(hash.filePath.value);
        for (const docId of linkedDocs) {
          const key = docId.value;
          countMap[key] = (countMap[key] || 0) + 1;
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