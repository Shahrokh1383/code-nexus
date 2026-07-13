// Project Context
export interface OpenProjectRequest {
  path: string;
}

export interface OpenProjectResponse {
  success: boolean;
  error?: string;
}

// FileSystem Context
export interface ScanRequest {
  rootPath: string;
}

export interface ScanResponse {
  files: string[];
  directories: string[];
}

// Documentation Context
export interface GetDocsListResponse {
  documents: Array<{
    id: string;
    path: string;
    title: string;
  }>;
}

// Linking Context
export interface CreateLinkRequest {
  codeFilePath: string;
  documentPath: string;
  type: 'DIRECT' | 'INHERITED';
}

export interface DeleteLinkRequest {
  linkId: string;
}

// Tracking Context
export interface GetStatusResponse {
  filePath: string;
  hash: string;
  status: 'unchanged' | 'modified' | 'untracked';
}

export interface CommitRequest {
  documentId: string;
}

// Notification Context
export interface GetWarningsResponse {
  warnings: Array<{
    id: string;
    type: 'OUTDATED' | 'ORPHAN' | 'UNLINKED';
    message: string;
    documentPath?: string;
    filePath?: string;
  }>;
}

export interface DismissWarningRequest {
  warningId: string;
}
export interface CreateCodeLinkRequest {
  codeFileId: string;
  documentId: string;
}

export interface CreateDocumentLinkRequest {
  parentDocumentId: string;
  childDocumentId: string;
}

export interface MigrateLinksRequest {
  oldDocumentId: string;
  newDocumentIds: string[];
}