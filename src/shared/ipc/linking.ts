/**
 * Linking feature IPC contract 
 * Channel strings are byte-for-byte from the legacy IpcChannels enum so the
 * preload whitelist and existing renderer callers remain compatible.
 */

export const LINKING_CHANNELS = {
  CREATE_LINK: 'linking:createLink',
  REMOVE_LINK: 'linking:removeLink',
  CREATE_DOCUMENT_LINK: 'linking:createDocumentLink',
  REMOVE_DOCUMENT_LINK: 'linking:removeDocumentLink',
  MIGRATE_LINKS: 'linking:migrateLinks',
  GET_LINKS_FOR_DOCUMENT: 'linking:getLinksForDocument',
  GET_LINKS_FOR_CODEFILE: 'linking:getLinksForCodeFile',
  GET_UNLINKED_CODEFILES: 'linking:getUnlinkedCodeFiles',
  GET_DOCUMENT_CHILDREN: 'linking:getDocumentChildren',
  GET_DOCUMENT_PARENTS: 'linking:getDocumentParents',
  CREATE_BULK_CODE_LINKS: 'linking:createBulkCodeLinks',
  UPDATED: 'linking:updated',
} as const;

export type LinkingChannel =
  (typeof LINKING_CHANNELS)[keyof typeof LINKING_CHANNELS];

// ─── Response DTOs (verbatim from legacy DTOs; the wire format is preserved) ───

export interface CodeToDocLinkDto {
  id: string;
  codeFileId: string;
  documentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
  migratedAt: string | null;
  codeFileName: string;
  codeFilePath: string;
}

export interface CodeFileSummaryDto {
  id: string;
  name: string;
  path: string;
}

export interface DocumentLinkDto {
  id: string;
  parentDocumentId: string;
  childDocumentId: string;
  type: 'DIRECT' | 'INHERITED';
  createdAt: string;
}

export interface LinkGraphDto {
  documentId: string;
  codeLinks: CodeToDocLinkDto[];
  childDocumentLinks: DocumentLinkDto[];
  parentDocumentLinks: DocumentLinkDto[];
}

export interface BulkCreateResult {
  createdIds: string[];
  skippedIds: string[];
}

// ─── Request DTOs (one per channel; workspaceId is the workspace root path) ───

export interface CreateLinkInput {
  workspaceId: string;
  codeFileId: string;
  documentId: string;
}

export interface RemoveLinkInput {
  workspaceId: string;
  linkId: string;
}

export interface CreateDocumentLinkInput {
  workspaceId: string;
  parentDocumentId: string;
  childDocumentId: string;
}

export interface RemoveDocumentLinkInput {
  workspaceId: string;
  linkId: string;
}

export interface MigrateLinksInput {
  workspaceId: string;
  oldDocumentId: string;
  newDocumentIds: string[];
}

export interface GetLinksForDocumentInput {
  workspaceId: string;
  documentId: string;
}

export interface GetLinksForCodeFileInput {
  workspaceId: string;
  codeFileId: string;
}

export interface GetUnlinkedCodeFilesInput {
  workspaceId: string;
}

export interface GetDocumentChildrenInput {
  workspaceId: string;
  parentDocumentId: string;
}

export interface GetDocumentParentsInput {
  workspaceId: string;
  childDocumentId: string;
}

export interface CreateBulkCodeLinksInput {
  workspaceId: string;
  codeFileIds: string[];
  documentId: string;
}