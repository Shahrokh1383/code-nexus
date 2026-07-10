import { JsonDatabase } from '../../../../infrastructure/persistence/json-database';
import { DocumentId } from '../../domain/value-objects/document-id';
import { DocumentPath } from '../../domain/value-objects/document-path';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { Document } from '../../domain/entities/document';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';

interface DocumentSchema {
  id: string;
  path: string;
  title: string;
  lastModified: string;
  linkCount: number;
  isOrphaned: boolean;
}

interface DocumentsIndexSchema {
  version: string;
  docsFolderPath: string | null;
  documents: DocumentSchema[];
}

export class DocumentJsonRepository implements IDocumentRepository {
  private readonly filename = 'documents.json';

  constructor(private readonly db: JsonDatabase) {}

  async findById(id: DocumentId): Promise<Document | null> {
    const index = await this.readIndex();
    const found = index.documents.find((d) => d.id === id.value);
    return found ? this.mapToEntity(found) : null;
  }

  async findByPath(path: DocumentPath): Promise<Document | null> {
    const index = await this.readIndex();
    const found = index.documents.find((d) => d.path === path.value);
    return found ? this.mapToEntity(found) : null;
  }

  async findAll(): Promise<Document[]> {
    const index = await this.readIndex();
    return index.documents.map((d) => this.mapToEntity(d));
  }

  async findOrphaned(): Promise<Document[]> {
    const index = await this.readIndex();
    return index.documents
      .filter((d) => d.isOrphaned)
      .map((d) => this.mapToEntity(d));
  }

  async save(document: Document): Promise<void> {
    const index = await this.readIndex();
    const existingIndex = index.documents.findIndex(
      (d) => d.id === document.id.value
    );

    const schema: DocumentSchema = {
      id: document.id.value,
      path: document.path.value,
      title: document.title,
      lastModified: document.lastModified.toISO(),
      linkCount: document.linkCount,
      isOrphaned: document.isOrphaned,
    };

    if (existingIndex >= 0) {
      index.documents[existingIndex] = schema;
    } else {
      index.documents.push(schema);
    }

    await this.db.write(this.filename, index);
  }

  async delete(id: DocumentId): Promise<void> {
    const index = await this.readIndex();
    index.documents = index.documents.filter((d) => d.id !== id.value);
    await this.db.write(this.filename, index);
  }

  async findByDocFolderPath(docFolderPath: string): Promise<Document[]> {
    const index = await this.readIndex();

    return index.documents
      .filter(
        (d) =>
          d.path.startsWith(docFolderPath + '/') || d.path === docFolderPath
      )
      .map((d) => this.mapToEntity(d));
  }

  /**
   * Updates the stored docs folder path in the documents index.
   * Not part of IDocumentRepository interface — concrete implementation only.
   */
  async updateDocsFolderPath(path: string | null): Promise<void> {
    const index = await this.readIndex();
    index.docsFolderPath = path;
    await this.db.write(this.filename, index);
  }

  private async readIndex(): Promise<DocumentsIndexSchema> {
    try {
      return await this.db.read<DocumentsIndexSchema>(this.filename);
    } catch {
      return { version: '1.0', docsFolderPath: null, documents: [] };
    }
  }

  private mapToEntity(raw: DocumentSchema): Document {
    return new Document(
      new DocumentId(raw.id),
      new DocumentPath(raw.path),
      raw.title,
      DateTime.fromISO(raw.lastModified),
      raw.linkCount
    );
  }
}