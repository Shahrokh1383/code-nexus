import { DocumentId } from '../value-objects/document-id';
import { DocumentPath } from '../value-objects/document-path';
import { DocFolderId } from '../value-objects/doc-folder-id';
import { Document } from '../entities/document';

export interface IDocumentRepository {
  findById(id: DocumentId): Promise<Document | null>;
  findByPath(path: DocumentPath): Promise<Document | null>;
  findAll(): Promise<Document[]>;
  findOrphaned(): Promise<Document[]>;
  save(document: Document): Promise<void>;
  delete(id: DocumentId): Promise<void>;
  findByDocFolder(docFolderId: DocFolderId): Promise<Document[]>;
}