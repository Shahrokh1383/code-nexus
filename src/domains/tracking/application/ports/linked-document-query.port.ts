import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

/**
 * Port for querying which documents are linked to a given file.
 * Implemented by the Linking context once it is built.
 * Used by Tracking context to maintain Bounded Context Isolation.
 */
export interface ILinkedDocumentQueryPort {
  findLinkedDocuments(filePath: string): Promise<DocumentId[]>;
}