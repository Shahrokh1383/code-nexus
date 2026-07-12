import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetPendingChangesQuery } from '../queries/get-pending-changes.query';
import { FileHashDto } from '../dto/file-hash.dto';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';

export class GetPendingChangesHandler implements IQueryHandler<GetPendingChangesQuery, FileHashDto[]> {
  constructor(
    private readonly hashRepo: IHashRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(query: GetPendingChangesQuery): Promise<Result<FileHashDto[], string>> {
    try {
      const allHashes = await this.hashRepo.findAllHashes();
      const pendingHashes = allHashes.filter((h) => h.commitId.isNone);

      let filtered = pendingHashes;
      if (query.documentId) {
        const linkedFiles = await this.linkedDocQuery.findLinkedFiles(query.documentId);
        filtered = pendingHashes.filter((h) => linkedFiles.includes(h.filePath.value));
      }

      const dtos: FileHashDto[] = filtered.map((h) => ({
        filePath: h.filePath.value,
        hashValue: h.hashValue.value,
        committedAt: h.committedAt.isSome ? h.committedAt.getOrNull()!.toISO() : null,
        status: h.commitId.isNone ? 'PENDING' : 'APPROVED',
      }));

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get pending changes';
      return Result.fail(message);
    }
  }
}