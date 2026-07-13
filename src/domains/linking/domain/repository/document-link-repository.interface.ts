import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { DocumentToDocumentLink } from '../entities/document-to-document-link';
import { DocumentLinkId } from '../value-objects/document-link-id';

export interface IDocumentLinkRepository {
  findById(id: DocumentLinkId): Promise<DocumentToDocumentLink | null>;
  findByParentDocument(parentDocumentId: DocumentId): Promise<DocumentToDocumentLink[]>;
  findByChildDocument(childDocumentId: DocumentId): Promise<DocumentToDocumentLink[]>;
  findByParentAndChild(parentDocumentId: DocumentId, childDocumentId: DocumentId): Promise<DocumentToDocumentLink | null>;
  save(link: DocumentToDocumentLink): Promise<void>;
  delete(id: DocumentLinkId): Promise<void>;
  findChildrenOf(parentDocId: DocumentId): Promise<DocumentId[]>;
}