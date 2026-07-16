import { DocumentCommitApproval } from '../entities/document-commit-approval';
import { DocumentId } from '../../../documentation/domain/value-objects/document-id';

export interface IDocumentCommitApprovalRepository {
  findByDocument(documentId: DocumentId): Promise<DocumentCommitApproval[]>;
  save(approval: DocumentCommitApproval): Promise<void>;
}