import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { GetLinksForDocumentQuery } from '../queries/get-links-for-document.query';
import { CodeToDocLinkDto } from '../dto/link.dto';

export class GetLinksForDocumentHandler implements IQueryHandler<GetLinksForDocumentQuery, CodeToDocLinkDto[]> {
  constructor(private readonly linkRepository: ILinkRepository) {}

  async execute(query: GetLinksForDocumentQuery): Promise<Result<CodeToDocLinkDto[], string>> {
    try {
      const documentId = new DocumentId(query.documentId);
      const links = await this.linkRepository.findByDocument(documentId);
      
      const dtos: CodeToDocLinkDto[] = links.map(link => ({
        id: link.id.value,
        codeFileId: link.codeFileId.value,
        documentId: link.documentId.value,
        type: link.type.value,
        createdAt: link.createdAt.toISO(),
        migratedAt: link.migratedAt.map(d => d.toISO()).getOrNull()
      }));

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch links for document';
      return Result.fail(message);
    }
  }
}