import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { ILinkRepository } from '../../domain/repository/link-repository.interface';
import { CodeToDocLink } from '../../domain/entities/code-to-doc-link';
import { LinkId } from '../../domain/value-objects/link-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { LinkType } from '../../domain/value-objects/link-type';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Maybe } from '../../../shared-kernel/types/maybe';

interface CodeToDocLinkSchema {
  id: string;
  codeFileId: string;
  documentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
  migratedAt: string | null;
}

interface LinksIndexSchema {
  version: string;
  links: CodeToDocLinkSchema[];
}

const LINKS_INDEX_FILE = 'links.json';
const SCHEMA_VERSION = '1.0';

export class LinkJsonRepository implements ILinkRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findById(id: LinkId): Promise<CodeToDocLink | null> {
    const index = await this.readIndex();
    const entry = index.links.find(l => l.id === id.value);
    return entry ? this.mapToEntity(entry) : null;
  }

  async findByDocument(documentId: DocumentId): Promise<CodeToDocLink[]> {
    const index = await this.readIndex();
    return index.links
      .filter(l => l.documentId === documentId.value)
      .map(e => this.mapToEntity(e));
  }

  async findByCodeFile(codeFileId: FileNodeId): Promise<CodeToDocLink[]> {
    const index = await this.readIndex();
    return index.links
      .filter(l => l.codeFileId === codeFileId.value)
      .map(e => this.mapToEntity(e));
  }

  async findByCodeFileAndDocument(codeFileId: FileNodeId, documentId: DocumentId): Promise<CodeToDocLink | null> {
    const index = await this.readIndex();
    const entry = index.links.find(l => l.codeFileId === codeFileId.value && l.documentId === documentId.value);
    return entry ? this.mapToEntity(entry) : null;
  }

  async save(link: CodeToDocLink): Promise<void> {
    const index = await this.readIndex();
    const entryIndex = index.links.findIndex(l => l.id === link.id.value);
    const entry = this.mapToEntry(link);
    
    if (entryIndex >= 0) {
      index.links[entryIndex] = entry;
    } else {
      index.links.push(entry);
    }
    
    await this.writeIndex(index);
  }

  async delete(id: LinkId): Promise<void> {
    const index = await this.readIndex();
    index.links = index.links.filter(l => l.id !== id.value);
    await this.writeIndex(index);
  }

  async findAll(): Promise<CodeToDocLink[]> {
    const index = await this.readIndex();
    return index.links.map(e => this.mapToEntity(e));
  }

  private async readIndex(): Promise<LinksIndexSchema> {
    try {
      const data = await this.db.read<LinksIndexSchema>(LINKS_INDEX_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      return migrated as unknown as LinksIndexSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SCHEMA_VERSION, links: [] };
      }
      throw error;
    }
  }

  private async writeIndex(index: LinksIndexSchema): Promise<void> {
    await this.db.write(LINKS_INDEX_FILE, index);
  }

  private mapToEntity(entry: CodeToDocLinkSchema): CodeToDocLink {
    return CodeToDocLink.reconstitute(
      new LinkId(entry.id),
      new FileNodeId(entry.codeFileId),
      new DocumentId(entry.documentId),
      entry.type === 'DIRECT' ? LinkType.direct() : LinkType.inherited(),
      DateTime.fromISO(entry.createdAt),
      entry.migratedAt ? Maybe.some(DateTime.fromISO(entry.migratedAt)) : Maybe.none<DateTime>()
    );
  }

  private mapToEntry(link: CodeToDocLink): CodeToDocLinkSchema {
    return {
      id: link.id.value,
      codeFileId: link.codeFileId.value,
      documentId: link.documentId.value,
      type: link.type.value,
      createdAt: link.createdAt.toISO(),
      migratedAt: link.migratedAt.map(d => d.toISO()).getOrNull()
    };
  }
}