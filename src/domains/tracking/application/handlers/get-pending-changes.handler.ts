import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { GetPendingChangesQuery } from '../queries/get-pending-changes.query';
import { FileHashDto } from '../dto/file-hash.dto';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';

export class GetPendingChangesHandler implements IQueryHandler<GetPendingChangesQuery, FileHashDto[]> {
  constructor(
    private readonly repository: ITrackingRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(query: GetPendingChangesQuery): Promise<Result<FileHashDto[], string>> {
    try {
      const allHashes = await this.repository.findAllHashes();
      const pendingHashes = allHashes.filter((h) => h.commitId.isNone);

      let filtered = pendingHashes;
      if (query.documentId) {
        const documentId = new DocumentId(query.documentId);
        const docPaths: string[] = [];
        for (const hash of pendingHashes) {
          const linked = await this.linkedDocQuery.findLinkedDocuments(hash.filePath.value);
          if (linked.some((d) => d.equals(documentId))) {
            docPaths.push(hash.filePath.value);
          }
        }
        filtered = pendingHashes.filter((h) => docPaths.includes(h.filePath.value));
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