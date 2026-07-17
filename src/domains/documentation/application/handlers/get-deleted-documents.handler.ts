import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { GetDeletedDocumentsQuery } from '../queries/get-deleted-documents.query';
import { DocumentDto } from '../dto/document.dto';

export class GetDeletedDocumentsHandler implements IQueryHandler<GetDeletedDocumentsQuery, DocumentDto[]> {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(_query: GetDeletedDocumentsQuery): Promise<Result<DocumentDto[], string>> {
    try {
      const docs = await this.documentRepo.findAllDeleted();
      const dtos = docs.map((d) => ({
        id: d.id.value,
        path: d.path.value,
        title: d.title,
        lastModified: d.lastModified.toISO(),
        linkCount: d.linkCount,
        isOrphaned: d.isOrphaned,
      }));
      return Result.ok(dtos);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to fetch deleted documents');
    }
  }
}