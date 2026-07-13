import { DocumentId } from '../../../documentation/domain/value-objects/document-id';
import { FileNodeId } from '../../../filesystem/domain/value-objects/file-node-id';
import { CodeToDocLink } from '../entities/code-to-doc-link';
import { LinkId } from '../value-objects/link-id';

export interface ILinkRepository {
  findById(id: LinkId): Promise<CodeToDocLink | null>;
  findByDocument(documentId: DocumentId): Promise<CodeToDocLink[]>;
  findByCodeFile(codeFileId: FileNodeId): Promise<CodeToDocLink[]>;
  findByCodeFileAndDocument(codeFileId: FileNodeId, documentId: DocumentId): Promise<CodeToDocLink | null>;
  save(link: CodeToDocLink): Promise<void>;
  delete(id: LinkId): Promise<void>;
  findAll(): Promise<CodeToDocLink[]>;
}