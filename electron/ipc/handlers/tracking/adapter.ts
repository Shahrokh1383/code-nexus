import { ILinkedDocumentQueryPort } from '../../../../src/domains/tracking/application/ports/linked-document-query.port';
import { LinkJsonRepository } from '../../../../src/domains/linking/infrastructure/repository/link-json.repository';
import { FileSystemJsonRepository } from '../../../../src/domains/filesystem/infrastructure/repository/filesystem-json.repository';
import { DocumentId } from '../../../../src/domains/documentation/domain/value-objects/document-id';
import { FilePath } from '../../../../src/domains/filesystem/domain/value-objects/file-path';

export class LinkedDocumentQueryAdapter implements ILinkedDocumentQueryPort {
  constructor(
    private readonly linkRepo: LinkJsonRepository,
    private readonly fileSystemRepo: FileSystemJsonRepository
  ) {}

  async findLinkedDocuments(filePath: string): Promise<DocumentId[]> {
    const path = new FilePath(filePath);
    const fileNode = await this.fileSystemRepo.findByPath(path);
    if (!fileNode) return [];
    
    const links = await this.linkRepo.findByCodeFile(fileNode.id);
    return links.map((l) => l.documentId);
  }

  async findLinkedFiles(documentId: string): Promise<string[]> {
    const links = await this.linkRepo.findByDocument(new DocumentId(documentId));
    const filePaths: string[] = [];
    
    for (const link of links) {
      const fileNode = await this.fileSystemRepo.findById(link.codeFileId);
      if (fileNode) {
        filePaths.push(fileNode.path.value);
      }
    }
    return filePaths;
  }
}