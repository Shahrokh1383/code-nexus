import type { CodeLinkService } from '../../linking/services/CodeLinkService';

/**
 * Cross-module adapter — wraps linking's public `CodeLinkService`. No direct
 * imports of linking internals, no direct imports from filesystem/documentation
 * domains. Satisfies Constitution §2 (cross-module via contract only).
 *
 * Requires `CodeLinkService.resolveCodeFileId` and
 * `CodeLinkService.getCodeFilePathById` to be public (single-word edits to
 * linking — documented in the completion report).
 *
 * `findFilePathByFileId` resolves against the file-index, not against live
 * links, so it remains valid after the last link to a file is removed. This
 * is required by `LinkBroken` consumers.
 */
export class LinkedDocumentQuery {
  constructor(private readonly codeLinks: CodeLinkService) {}

  async findLinkedFiles(rootPath: string, documentId: string): Promise<string[]> {
    const links = await this.codeLinks.getLinksForDocument(rootPath, documentId);
    return links.map((l) => l.codeFilePath);
  }

  async findLinkedDocuments(rootPath: string, filePath: string): Promise<string[]> {
    const codeFileId = await this.codeLinks.resolveCodeFileId(rootPath, filePath);
    if (!codeFileId) return [];
    const links = await this.codeLinks.getLinksForCodeFile(rootPath, codeFileId);
    return links.map((l) => l.documentId);
  }

  async findFilePathByFileId(rootPath: string, fileId: string): Promise<string | null> {
    return this.codeLinks.getCodeFilePathById(rootPath, fileId);
  }
}