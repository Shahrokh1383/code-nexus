import type { AtomicJsonFile } from '../../../shared/persistence/atomic-json-file';
import type { Logger } from '../../../shared/logger/logger';
import { doclinkFilePath } from './doclink-path';
import { Document } from '../domain/Document';

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

const INDEX_VERSION = '1.0';
const FLUSH_DEBOUNCE_MS = 300;

export class DocumentJsonRepository {
  private readonly filename = 'documents.json';
  private readonly cache = new Map<string, DocumentsIndexSchema>();
  private readonly flushTimers = new Map<string, NodeJS.Timeout | null>();

  constructor(
    private readonly file: AtomicJsonFile,
    private readonly logger: Logger
  ) {}

  async findById(rootPath: string, id: string): Promise<Document | null> {
    const index = await this.readIndex(rootPath);
    const found = index.documents.find((d) => d.id === id);
    return found ? this.mapToEntity(found) : null;
  }

  async findByPath(rootPath: string, path: string): Promise<Document | null> {
    const index = await this.readIndex(rootPath);
    const found = index.documents.find((d) => d.path === path);
    return found ? this.mapToEntity(found) : null;
  }

  async findAll(rootPath: string): Promise<Document[]> {
    const index = await this.readIndex(rootPath);
    return index.documents.map((d) => this.mapToEntity(d));
  }

  async findAllNonDeleted(rootPath: string): Promise<Document[]> {
    const index = await this.readIndex(rootPath);
    return index.documents.filter((d) => !d.deleted).map((d) => this.mapToEntity(d));
  }

  async findAllDeleted(rootPath: string): Promise<Document[]> {
    const index = await this.readIndex(rootPath);
    return index.documents.filter((d) => d.deleted).map((d) => this.mapToEntity(d));
  }

  async findOrphaned(rootPath: string): Promise<Document[]> {
    const index = await this.readIndex(rootPath);
    return index.documents.filter((d) => d.isOrphaned && !d.deleted).map((d) => this.mapToEntity(d));
  }

  async findByDocFolderPath(rootPath: string, docFolderPath: string): Promise<Document[]> {
    const index = await this.readIndex(rootPath);
    return index.documents
      .filter((d) => (d.path.startsWith(docFolderPath + '/') || d.path === docFolderPath) && !d.deleted)
      .map((d) => this.mapToEntity(d));
  }

  async save(rootPath: string, document: Document): Promise<void> {
    const index = await this.readIndex(rootPath);
    const existingIndex = index.documents.findIndex((d) => d.id === document.id);

    const schema: DocumentSchema = {
      id: document.id,
      path: document.path,
      title: document.title,
      lastModified: document.lastModified,
      linkCount: document.linkCount,
      isOrphaned: document.isOrphaned,
      deleted: document.deleted,
    };

    if (existingIndex >= 0) {
      index.documents[existingIndex] = schema;
    } else {
      index.documents.push(schema);
    }

    this.scheduleFlush(rootPath);
  }

  async delete(rootPath: string, id: string): Promise<void> {
    const index = await this.readIndex(rootPath);
    index.documents = index.documents.filter((d) => d.id !== id);
    this.scheduleFlush(rootPath);
  }

  async softDelete(rootPath: string, id: string): Promise<void> {
    const index = await this.readIndex(rootPath);
    const doc = index.documents.find((d) => d.id === id);
    if (doc) {
      doc.deleted = true;
      this.scheduleFlush(rootPath);
    }
  }

  async restore(rootPath: string, id: string): Promise<void> {
    const index = await this.readIndex(rootPath);
    const doc = index.documents.find((d) => d.id === id);
    if (doc) {
      doc.deleted = false;
      this.scheduleFlush(rootPath);
    }
  }

  //Private Helpers 

  private async readIndex(rootPath: string): Promise<DocumentsIndexSchema> {
    const cached = this.cache.get(rootPath);
    if (cached) return cached;

    try {
      const data = await this.file.readJson<DocumentsIndexSchema>(
        doclinkFilePath(rootPath, this.filename)
      );
      const index: DocumentsIndexSchema = {
        version: typeof data?.version === 'string' ? data.version : INDEX_VERSION,
        documents: Array.isArray(data?.documents) ? data.documents : [],
      };
      this.cache.set(rootPath, index);
      return index;
    } catch {
      const empty: DocumentsIndexSchema = { version: INDEX_VERSION, documents: [] };
      this.cache.set(rootPath, empty);
      return empty;
    }
  }

  private scheduleFlush(rootPath: string): void {
    const existingTimer = this.flushTimers.get(rootPath);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.flushTimers.set(rootPath, null);
      const data = this.cache.get(rootPath);
      if (!data) return;
      this.file.writeJson(doclinkFilePath(rootPath, this.filename), data).catch((error: unknown) => {
        this.logger.error('documents store flush failed', {
          rootPath,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }, FLUSH_DEBOUNCE_MS);

    this.flushTimers.set(rootPath, timer);
  }

  private mapToEntity(raw: DocumentSchema): Document {
    return new Document(
      raw.id,
      raw.path,
      raw.title,
      raw.lastModified,
      raw.linkCount,
      raw.deleted ?? false
    );
  }
}