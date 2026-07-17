import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { GetOrphanedDocumentsQuery } from '../queries/get-orphaned-documents.query';
import { DocumentDto } from '../dto/document.dto';

export class GetOrphanedDocumentsHandler implements IQueryHandler<GetOrphanedDocumentsQuery, DocumentDto[]> {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(_query: GetOrphanedDocumentsQuery): Promise<Result<DocumentDto[], string>> {
    try {
      const orphans = await this.documentRepo.findOrphaned();
      const dtos = orphans.map((d) => ({
        id: d.id.value,
        path: d.path.value,
        title: d.title,
        lastModified: d.lastModified.toISO(),
        linkCount: d.linkCount,
        isOrphaned: d.isOrphaned,
      }));
      return Result.ok(dtos);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to fetch orphans');
    }
  }
}