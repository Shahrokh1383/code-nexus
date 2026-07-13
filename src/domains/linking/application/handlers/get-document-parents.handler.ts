import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { IDocumentLinkRepository } from '../../domain/repository/document-link-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { GetDocumentParentsQuery } from '../queries/get-document-parents.query';
import { DocumentLinkDto } from '../dto/document-link.dto';

export class GetDocumentParentsHandler implements IQueryHandler<GetDocumentParentsQuery, DocumentLinkDto[]> {
  constructor(private readonly docLinkRepository: IDocumentLinkRepository) {}

  async execute(query: GetDocumentParentsQuery): Promise<Result<DocumentLinkDto[], string>> {
    try {
      const childId = new DocumentId(query.childDocumentId);
      const links = await this.docLinkRepository.findByChildDocument(childId);
      
      const dtos: DocumentLinkDto[] = links.map(link => ({
        id: link.id.value,
        parentDocumentId: link.parentDocumentId.value,
        childDocumentId: link.childDocumentId.value,
        type: link.type.value,
        createdAt: link.createdAt.toISO()
      }));

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch document parents';
      return Result.fail(message);
    }
  }
}