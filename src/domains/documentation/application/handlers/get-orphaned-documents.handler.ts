import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { Document } from '../../domain/entities/document';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { GetOrphanedDocumentsQuery } from '../queries/get-orphaned-documents.query';
import { DocumentDto } from '../dto/document.dto';

export class GetOrphanedDocumentsHandler
  implements IQueryHandler<GetOrphanedDocumentsQuery, DocumentDto[]>
{
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async execute(
    _query: GetOrphanedDocumentsQuery
  ): Promise<Result<DocumentDto[], string>> {
    try {
      const documents = await this.documentRepo.findOrphaned();
      return Result.ok(documents.map((d) => this.mapToDto(d)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orphaned documents';
      return Result.fail(message);
    }
  }

  private mapToDto(document: Document): DocumentDto {
    return {
      id: document.id.value,
      path: document.path.value,
      title: document.title,
      lastModified: document.lastModified.toISO(),
      linkCount: document.linkCount,
      isOrphaned: document.isOrphaned,
    };
  }
}