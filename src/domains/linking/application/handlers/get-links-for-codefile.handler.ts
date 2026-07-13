import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { GetLinksForCodeFileQuery } from '../queries/get-links-for-codefile.query';
import { CodeToDocLinkDto } from '../dto/link.dto';

export class GetLinksForCodeFileHandler implements IQueryHandler<GetLinksForCodeFileQuery, CodeToDocLinkDto[]> {
  constructor(private readonly linkRepository: ILinkRepository) {}

  async execute(query: GetLinksForCodeFileQuery): Promise<Result<CodeToDocLinkDto[], string>> {
    try {
      const codeFileId = new FileNodeId(query.codeFileId);
      const links = await this.linkRepository.findByCodeFile(codeFileId);
      
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
      const message = error instanceof Error ? error.message : 'Failed to fetch links for code file';
      return Result.fail(message);
    }
  }
}