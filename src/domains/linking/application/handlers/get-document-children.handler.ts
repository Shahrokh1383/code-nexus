import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { IDocumentLinkRepository } from '../../domain/repository/document-link-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { GetDocumentChildrenQuery } from '../queries/get-document-children.query';

export class GetDocumentChildrenHandler implements IQueryHandler<GetDocumentChildrenQuery, string[]> {
  constructor(private readonly docLinkRepository: IDocumentLinkRepository) {}

  async execute(query: GetDocumentChildrenQuery): Promise<Result<string[], string>> {
    try {
      const parentId = new DocumentId(query.parentDocumentId);
      const children = await this.docLinkRepository.findChildrenOf(parentId);
      return Result.ok(children.map(c => c.value));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch document children';
      return Result.fail(message);
    }
  }
}