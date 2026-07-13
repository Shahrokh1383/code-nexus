import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { SchemaMigrator } from '../../../../infrastructure/persistence/migration/schema-migrator';
import { IDocumentLinkRepository } from '../../domain/repository/document-link-repository.interface';
import { DocumentToDocumentLink } from '../../domain/entities/document-to-document-link';
import { DocumentLinkId } from '../../domain/value-objects/document-link-id';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { LinkType } from '../../domain/value-objects/link-type';
import { DateTime } from '../../../shared-kernel/types/date-time';

interface DocumentLinkSchema {
  id: string;
  parentDocumentId: string;
  childDocumentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
}

interface DocumentLinksIndexSchema {
  version: string;
  links: DocumentLinkSchema[];
}

const DOC_LINKS_INDEX_FILE = 'document-links.json';
const SCHEMA_VERSION = '1.0';

export class DocumentLinkJsonRepository implements IDocumentLinkRepository {
  private readonly db: JsonDatabase;
  private readonly migrator: SchemaMigrator;

  constructor(workspaceRoot: string) {
    this.db = new JsonDatabase(workspaceRoot);
    this.migrator = new SchemaMigrator(SCHEMA_VERSION);
  }

  async findById(id: DocumentLinkId): Promise<DocumentToDocumentLink | null> {
    const index = await this.readIndex();
    const entry = index.links.find(l => l.id === id.value);
    return entry ? this.mapToEntity(entry) : null;
  }

  async findByParentDocument(parentDocumentId: DocumentId): Promise<DocumentToDocumentLink[]> {
    const index = await this.readIndex();
    return index.links
      .filter(l => l.parentDocumentId === parentDocumentId.value)
      .map(e => this.mapToEntity(e));
  }

  async findByChildDocument(childDocumentId: DocumentId): Promise<DocumentToDocumentLink[]> {
    const index = await this.readIndex();
    return index.links
      .filter(l => l.childDocumentId === childDocumentId.value)
      .map(e => this.mapToEntity(e));
  }

  async findByParentAndChild(parentDocumentId: DocumentId, childDocumentId: DocumentId): Promise<DocumentToDocumentLink | null> {
    const index = await this.readIndex();
    const entry = index.links.find(l => l.parentDocumentId === parentDocumentId.value && l.childDocumentId === childDocumentId.value);
    return entry ? this.mapToEntity(entry) : null;
  }

  async save(link: DocumentToDocumentLink): Promise<void> {
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

  async delete(id: DocumentLinkId): Promise<void> {
    const index = await this.readIndex();
    index.links = index.links.filter(l => l.id !== id.value);
    await this.writeIndex(index);
  }

  async findChildrenOf(parentDocId: DocumentId): Promise<DocumentId[]> {
    const index = await this.readIndex();
    return index.links
      .filter(l => l.parentDocumentId === parentDocId.value)
      .map(l => new DocumentId(l.childDocumentId));
  }

  private async readIndex(): Promise<DocumentLinksIndexSchema> {
    try {
      const data = await this.db.read<DocumentLinksIndexSchema>(DOC_LINKS_INDEX_FILE);
      const migrated = this.migrator.migrate(data as unknown as Record<string, unknown>);
      return migrated as unknown as DocumentLinksIndexSchema;
    } catch (error) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: SCHEMA_VERSION, links: [] };
      }
      throw error;
    }
  }

  private async writeIndex(index: DocumentLinksIndexSchema): Promise<void> {
    await this.db.write(DOC_LINKS_INDEX_FILE, index);
  }

  private mapToEntity(entry: DocumentLinkSchema): DocumentToDocumentLink {
    return DocumentToDocumentLink.reconstitute(
      new DocumentLinkId(entry.id),
      new DocumentId(entry.parentDocumentId),
      new DocumentId(entry.childDocumentId),
      entry.type === 'DIRECT' ? LinkType.direct() : LinkType.inherited(),
      DateTime.fromISO(entry.createdAt)
    );
  }

  private mapToEntry(link: DocumentToDocumentLink): DocumentLinkSchema {
    return {
      id: link.id.value,
      parentDocumentId: link.parentDocumentId.value,
      childDocumentId: link.childDocumentId.value,
      type: link.type.value,
      createdAt: link.createdAt.toISO()
    };
  }
}