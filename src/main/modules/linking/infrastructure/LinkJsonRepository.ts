import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import { doclinkFilePath } from './doclink-path';
import { CodeToDocLink, type LinkType } from '../domain/CodeToDocLink';

const LINKS_INDEX_FILE = 'links.json';
const SCHEMA_VERSION = '1.0';

interface CodeToDocLinkSchema {
  id: string;
  codeFileId: string;
  documentId: string;
  type: LinkType;
  createdAt: string;
  migratedAt: string | null;
}

interface LinksIndexSchema {
  version: string;
  links: CodeToDocLinkSchema[];
}

/**
 * JSON store for code-to-document links at <workspace>/.doclink/links.json.
 * Reads/writes are serialized by AtomicJsonFile's per-file write queue.
 */
export class LinkJsonRepository {
  constructor(private readonly file: AtomicJsonFile) {}

  async findById(rootPath: string, id: string): Promise<CodeToDocLink | null> {
    const index = await this.readIndex(rootPath);
    const entry = index.links.find((l) => l.id === id);
    return entry ? this.mapToEntity(entry) : null;
  }

  async findByDocument(rootPath: string, documentId: string): Promise<CodeToDocLink[]> {
    const index = await this.readIndex(rootPath);
    return index.links
      .filter((l) => l.documentId === documentId)
      .map((entry) => this.mapToEntity(entry));
  }

  async findByCodeFile(rootPath: string, codeFileId: string): Promise<CodeToDocLink[]> {
    const index = await this.readIndex(rootPath);
    return index.links
      .filter((l) => l.codeFileId === codeFileId)
      .map((entry) => this.mapToEntity(entry));
  }

  async findByCodeFileAndDocument(
    rootPath: string,
    codeFileId: string,
    documentId: string
  ): Promise<CodeToDocLink | null> {
    const index = await this.readIndex(rootPath);
    const entry = index.links.find(
      (l) => l.codeFileId === codeFileId && l.documentId === documentId
    );
    return entry ? this.mapToEntity(entry) : null;
  }

  async save(rootPath: string, link: CodeToDocLink): Promise<void> {
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

  async findAll(rootPath: string): Promise<CodeToDocLink[]> {
    const index = await this.readIndex(rootPath);
    return index.links.map((entry) => this.mapToEntity(entry));
  }

  private async readIndex(rootPath: string): Promise<LinksIndexSchema> {
    try {
      const data = await this.file.readJson<LinksIndexSchema>(
        doclinkFilePath(rootPath, LINKS_INDEX_FILE)
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

  private async writeIndex(rootPath: string, index: LinksIndexSchema): Promise<void> {
    await this.file.writeJson(doclinkFilePath(rootPath, LINKS_INDEX_FILE), index);
  }

  private mapToEntity(entry: CodeToDocLinkSchema): CodeToDocLink {
    return CodeToDocLink.reconstitute(
      entry.id,
      entry.codeFileId,
      entry.documentId,
      entry.type,
      entry.createdAt,
      entry.migratedAt
    );
  }

  private mapToEntry(link: CodeToDocLink): CodeToDocLinkSchema {
    return {
      id: link.id,
      codeFileId: link.codeFileId,
      documentId: link.documentId,
      type: link.type,
      createdAt: link.createdAt,
      migratedAt: link.migratedAt,
    };
  }
}