import { CodeToDocLinkDto } from './code-to-doc-link.dto';
import { DocumentLinkDto } from './document-link.dto';

export interface LinkGraphDto {
  documentId: string;
  codeLinks: CodeToDocLinkDto[];
  childDocumentLinks: DocumentLinkDto[];
  parentDocumentLinks: DocumentLinkDto[];
}