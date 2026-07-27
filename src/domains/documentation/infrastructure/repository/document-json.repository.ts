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
  deleted: boolean;
}

interface DocumentsIndexSchema {
  version: string;
  documents: DocumentSchema[];
}

export class DocumentJsonRepository implements IDocumentRepository {
  private readonly filename = 'documents.json';
  private cache: DocumentsIndexSchema | null = null;
  private saveTimer: NodeJS.Timeout | null = null;

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

  async findAllNonDeleted(): Promise<Document[]> {
    const index = await this.readIndex();
    return index.documents.filter((d) => !d.deleted).map((d) => this.mapToEntity(d));
  }

  async findAllDeleted(): Promise<Document[]> {
    const index = await this.readIndex();
    return index.documents.filter((d) => d.deleted).map((d) => this.mapToEntity(d));
  }

  async findOrphaned(): Promise<Document[]> {
    const index = await this.readIndex();
    return index.documents.filter((d) => d.isOrphaned && !d.deleted).map((d) => this.mapToEntity(d));
  }

  async save(document: Document): Promise<void> {
    const index = await this.readIndex();
    const existingIndex = index.documents.findIndex((d) => d.id === document.id.value);

    const schema: DocumentSchema = {
      id: document.id.value,
      path: document.path.value,
      title: document.title,
      lastModified: document.lastModified.toISO(),
      linkCount: document.linkCount,
      isOrphaned: document.isOrphaned,
      deleted: document.deleted,
    };

    if (existingIndex >= 0) {
      index.documents[existingIndex] = schema;
    } else {
      index.documents.push(schema);
    }

    this.scheduleWrite();
  }

  async delete(id: DocumentId): Promise<void> {
    const index = await this.readIndex();
    index.documents = index.documents.filter((d) => d.id !== id.value);
    this.scheduleWrite();
  }

  async softDelete(id: DocumentId): Promise<void> {
    const index = await this.readIndex();
    const doc = index.documents.find((d) => d.id === id.value);
    if (doc) {
      doc.deleted = true;
      this.scheduleWrite();
    }
  }

  async restore(id: DocumentId): Promise<void> {
    const index = await this.readIndex();
    const doc = index.documents.find((d) => d.id === id.value);
    if (doc) {
      doc.deleted = false;
      this.scheduleWrite();
    }
  }

  async findByDocFolderPath(docFolderPath: string): Promise<Document[]> {
    const index = await this.readIndex();
    return index.documents
      .filter((d) => (d.path.startsWith(docFolderPath + '/') || d.path === docFolderPath) && !d.deleted)
      .map((d) => this.mapToEntity(d));
  }

  // ─────────────────────── Private Helpers ───────────────────────

  private async readIndex(): Promise<DocumentsIndexSchema> {
    if (this.cache) return this.cache;
    try {
      this.cache = await this.db.read<DocumentsIndexSchema>(this.filename);
    } catch {
      this.cache = { version: '1.0', documents: [] };
    }
    return this.cache;
  }

  /**
   * Debounces disk writes. If called 100 times in a loop,
   * it will only write to disk once 300ms after the last call.
   * This completely eliminates the N+1 I/O bottleneck.
   */
  private scheduleWrite(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      if (this.cache) {
        await this.db.write(this.filename, this.cache);
      }
    }, 300);
  }

  private mapToEntity(raw: DocumentSchema): Document {
    return new Document(
      new DocumentId(raw.id),
      new DocumentPath(raw.path),
      raw.title,
      DateTime.fromISO(raw.lastModified),
      raw.linkCount,
      raw.deleted ?? false
    );
  }
}