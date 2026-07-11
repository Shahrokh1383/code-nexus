import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

export interface ILinkedDocumentQueryPort {
  findLinkedDocuments(filePath: string): Promise<DocumentId[]>;
  findLinkedFiles(documentId: string): Promise<string[]>; 
}