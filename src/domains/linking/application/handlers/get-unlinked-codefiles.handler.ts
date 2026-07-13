import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { ICodeFileQueryPort } from '../ports/code-file-query.port';
import { CodeFileSummaryDto } from '../dto/link.dto';
import { GetUnlinkedCodefilesQuery } from '../queries/get-unlinked-codefiles.query';

export class GetUnlinkedCodefilesHandler implements IQueryHandler<GetUnlinkedCodefilesQuery, CodeFileSummaryDto[]> {
  constructor(
    private readonly linkRepository: ILinkRepository,
    private readonly codeFileQueryPort: ICodeFileQueryPort
  ) {}

  async execute(_query: GetUnlinkedCodefilesQuery): Promise<Result<CodeFileSummaryDto[], string>> {
    try {
      const allCodeFiles = await this.codeFileQueryPort.getAllCodeFiles();
      const allLinks = await this.linkRepository.findAll();
      
      const linkedFileIds = new Set(allLinks.map(l => l.codeFileId.value));
      const unlinked = allCodeFiles.filter(f => !linkedFileIds.has(f.id));
      
      return Result.ok(unlinked);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch unlinked code files';
      return Result.fail(message);
    }
  }
}