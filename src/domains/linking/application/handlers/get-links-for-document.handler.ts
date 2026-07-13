import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { GetLinksForDocumentQuery } from '../queries/get-links-for-document.query';
import { CodeToDocLinkDto } from '../dto/link.dto';
import { ICodeFileQueryPort } from '../ports/code-file-query.port';

export class GetLinksForDocumentHandler implements IQueryHandler<GetLinksForDocumentQuery, CodeToDocLinkDto[]> {
  constructor(
    private readonly linkRepository: ILinkRepository,
    private readonly codeFilePort: ICodeFileQueryPort
  ) {}

  async execute(query: GetLinksForDocumentQuery): Promise<Result<CodeToDocLinkDto[], string>> {
    try {
      const documentId = new DocumentId(query.documentId);
      const links = await this.linkRepository.findByDocument(documentId);

      const allCodeFiles = await this.codeFilePort.getAllCodeFiles();
      const fileMap = new Map<string, { name: string; path: string }>();
      for (const f of allCodeFiles) {
        fileMap.set(f.id, { name: f.name, path: f.path });
      }

      const dtos: CodeToDocLinkDto[] = links.map(link => {
        const fileInfo = fileMap.get(link.codeFileId.value) ?? { name: 'unknown', path: 'unknown' };
        return {
          id: link.id.value,
          codeFileId: link.codeFileId.value,
          documentId: link.documentId.value,
          type: link.type.value,
          createdAt: link.createdAt.toISO(),
          migratedAt: link.migratedAt.map(d => d.toISO()).getOrNull(),
          codeFileName: fileInfo.name,
          codeFilePath: fileInfo.path,
        };
      });

      return Result.ok(dtos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch links for document';
      return Result.fail(message);
    }
  }
}