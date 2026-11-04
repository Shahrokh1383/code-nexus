import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { doclinkFilePath } from './doclink-path';
import { DocumentToDocumentLink } from '../domain/DocumentToDocumentLink';
import type { LinkType } from '../domain/CodeToDocLink';

const DOC_LINKS_INDEX_FILE = 'document-links.json';
const SCHEMA_VERSION = '1.0';

interface DocumentLinkSchema {
  id: string;
  parentDocumentId: string;
  childDocumentId: string;
  type: LinkType;
  createdAt: string;
}

interface DocumentLinksIndexSchema {
  version: string;
  links: DocumentLinkSchema[];
}

/**
 * JSON store for document-to-document links at <workspace>/.doclink/document-links.json.
 */
export class DocumentLinkJsonRepository {
  constructor(private readonly file: AtomicJsonFile) {}

  async findById(rootPath: string, id: string): Promise<DocumentToDocumentLink | null> {
    const index = await this.readIndex(rootPath);
    const entry = index.links.find((l) => l.id === id);
    return entry ? this.mapToEntity(entry) : null;
  }

  async findByParentDocument(
    rootPath: string,
    parentDocumentId: string
  ): Promise<DocumentToDocumentLink[]> {
    const index = await this.readIndex(rootPath);
    return index.links
      .filter((l) => l.parentDocumentId === parentDocumentId)
      .map((entry) => this.mapToEntity(entry));
  }

  async findByChildDocument(
    rootPath: string,
    childDocumentId: string
  ): Promise<DocumentToDocumentLink[]> {
    const index = await this.readIndex(rootPath);
    return index.links
      .filter((l) => l.childDocumentId === childDocumentId)
      .map((entry) => this.mapToEntity(entry));
  }

  async save(rootPath: string, link: DocumentToDocumentLink): Promise<void> {
    const index = await this.readIndex(rootPath);
    const position = index.links.findIndex((l) => l.id === link.id);
    const entry = this.mapToEntry(link);

    if (position >= 0) {
      index.links[position] = entry;
    } else {
      index.links.push(entry);
    }

    await this.writeIndex(rootPath, index);
  }

  async delete(rootPath: string, id: string): Promise<void> {
    const index = await this.readIndex(rootPath);
    index.links = index.links.filter((l) => l.id !== id);
    await this.writeIndex(rootPath, index);
  }

  private async readIndex(rootPath: string): Promise<DocumentLinksIndexSchema> {
    try {
      const data = await this.file.readJson<DocumentLinksIndexSchema>(
        doclinkFilePath(rootPath, DOC_LINKS_INDEX_FILE)
      );
      return {
        version: typeof data?.version === 'string' ? data.version : SCHEMA_VERSION,
        links: Array.isArray(data?.links) ? data.links : [],
      };
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SCHEMA_VERSION, links: [] };
      }
      throw error;
    }
  }

  private async writeIndex(
    rootPath: string,
    index: DocumentLinksIndexSchema
  ): Promise<void> {
    await this.file.writeJson(doclinkFilePath(rootPath, DOC_LINKS_INDEX_FILE), index);
  }

  private mapToEntity(entry: DocumentLinkSchema): DocumentToDocumentLink {
    return DocumentToDocumentLink.reconstitute(
      entry.id,
      entry.parentDocumentId,
      entry.childDocumentId,
      entry.type,
      entry.createdAt
    );
  }

  private mapToEntry(link: DocumentToDocumentLink): DocumentLinkSchema {
    return {
      id: link.id,
      parentDocumentId: link.parentDocumentId,
      childDocumentId: link.childDocumentId,
      type: link.type,
      createdAt: link.createdAt,
    };
  }
}