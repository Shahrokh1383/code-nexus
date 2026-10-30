/**
 * Documentation context IPC contract — channel names + pure DTO types.
 * Must stay free of Zod, Node.js imports, and runtime logic
 */
export const DOCUMENTATION_CHANNELS = {
  REGISTER_FOLDER: 'documentation:register-folder',
  DETECT_RELOCATION: 'documentation:detect-relocation',
  GET_ALL: 'documentation:get-all',
  GET_DELETED: 'documentation:get-deleted',
  GET_ORPHANED: 'documentation:get-orphaned',
  SOFT_DELETE_DOCUMENT: 'documentation:soft-delete-document',
  PERMANENT_DELETE_DOCUMENT: 'documentation:permanent-delete-document',
  RESTORE_DOCUMENT: 'documentation:restore-document',
  SYNC_FILES: 'documentation:sync-files',
} as const;

export interface DocumentDto {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly lastModified: string;
  readonly linkCount: number;
  readonly isOrphaned: boolean;
}

export interface DocFolderSignatureDto {
  readonly fileCount: number;
  readonly topLevelFileNames: readonly string[];
  readonly directoryDepth: number;
}

export interface DocFolderDto {
  readonly id: string;
  readonly path: string;
  readonly signature: DocFolderSignatureDto;
  readonly documentCount: number;
}

export interface GetAllDocumentsResponse {
  readonly documents: readonly DocumentDto[];
  readonly docFolder: DocFolderDto | null;
}

export interface RegisterDocsFolderInput {
  readonly workspaceId: string;
  readonly suggestedPath?: string;
}

export interface DetectRelocationInput {
  readonly workspaceId: string;
}

export interface GetAllDocumentsInput {
  readonly workspaceId: string;
}

export interface GetDeletedDocumentsInput {
  readonly workspaceId: string;
}

export interface GetOrphanedDocumentsInput {
  readonly workspaceId: string;
}

export interface SyncFilesInput {
  readonly workspaceId: string;
}

export interface SoftDeleteDocumentInput {
  readonly workspaceId: string;
  readonly documentId: string;
}

export interface PermanentDeleteDocumentInput {
  readonly workspaceId: string;
  readonly documentId: string;
}

export interface RestoreDocumentInput {
  readonly workspaceId: string;
  readonly documentId: string;
}