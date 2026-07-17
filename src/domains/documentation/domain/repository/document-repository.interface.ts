import { DocumentId } from '../value-objects/document-id';
import { DocumentPath } from '../value-objects/document-path';
import { Document } from '../entities/document';

export interface IDocumentRepository {
  findById(id: DocumentId): Promise<Document | null>;
  findByPath(path: DocumentPath): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  findAllNonDeleted(): Promise<Document[]>;
  findAllDeleted(): Promise<Document[]>;
  findOrphaned(): Promise<Document[]>;
  save(document: Document): Promise<void>;
  delete(id: DocumentId): Promise<void>;
  softDelete(id: DocumentId): Promise<void>;
  restore(id: DocumentId): Promise<void>;
  findByDocFolderPath(docFolderPath: string): Promise<Document[]>;
}