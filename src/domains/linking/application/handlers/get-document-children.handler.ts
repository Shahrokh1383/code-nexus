import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { IDocumentLinkRepository } from '../../domain/repository/document-link-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { GetDocumentChildrenQuery } from '../queries/get-document-children.query';
import { DocumentLinkDto } from '../dto/document-link.dto';

export class GetDocumentChildrenHandler implements IQueryHandler<GetDocumentChildrenQuery, DocumentLinkDto[]> {
  constructor(private readonly docLinkRepository: IDocumentLinkRepository) {}

  async execute(query: GetDocumentChildrenQuery): Promise<Result<DocumentLinkDto[], string>> {
    try {
      const parentId = new DocumentId(query.parentDocumentId);
      const links = await this.docLinkRepository.findByParentDocument(parentId);
      
      const dtos: DocumentLinkDto[] = links.map(link => ({
        id: link.id.value,
        parentDocumentId: link.parentDocumentId.value,
        childDocumentId: link.childDocumentId.value,
        type: link.type.value,
        createdAt: link.createdAt.toISO()
      }));

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch document children';
      return Result.fail(message);
    }
  }
}