import { IQueryHandler } from '../../../shared-kernel/application/query-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { Document } from '../../domain/entities/document';
import { DocFolder } from '../../domain/entities/doc-folder';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { IDocFolderRepository } from '../../domain/repository/doc-folder-repository.interface';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { GetAllDocumentsQuery } from '../queries/get-all-documents.query';
import { DocumentDto } from '../dto/document.dto';
import { DocFolderDto } from '../dto/doc-folder.dto';

export interface GetAllDocumentsResponse {
  documents: DocumentDto[];
  docFolder: DocFolderDto | null;
}

export class GetAllDocumentsHandler
  implements IQueryHandler<GetAllDocumentsQuery, GetAllDocumentsResponse>
{
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly docFolderRepo: IDocFolderRepository,
    private readonly configRepo: IProjectConfigRepository
  ) {}

  async execute(
    query: GetAllDocumentsQuery
  ): Promise<Result<GetAllDocumentsResponse, string>> {
    try {
      const workspaceId = new WorkspaceId(query.workspaceId);
      const config = await this.configRepo.findByWorkspaceId(workspaceId);

      const documents = await this.documentRepo.findAll();
      const documentDtos = documents.map((d) => this.mapToDto(d));

      let docFolder: DocFolder | null = null;
      let docFolderDto: DocFolderDto | null = null;

      if (config && config.docsFolderPath.getOrNull()) {
        docFolder = await this.docFolderRepo.findByPath(config.docsFolderPath.getOrNull()!);
        if (docFolder) {
          docFolderDto = {
            id: docFolder.id.value,
            path: docFolder.path,
            documentCount: docFolder.documentCount,
            signature: {
              fileCount: docFolder.signature.fileCount,
              topLevelFileNames: docFolder.signature.topLevelFileNames,
              directoryDepth: docFolder.signature.directoryDepth,
            },
          };
        }
      }

      return Result.ok({ documents: documentDtos, docFolder: docFolderDto });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch documents';
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