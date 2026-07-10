export const DATABASE_SCHEMA_VERSION = '1.0';

export interface WorkspaceSchema {
  id: string;
  rootPath: string;
  metadataFolderPath: string;
  createdAt: string;
  lastScanAt: string | null;
}

export interface DocumentSchema {
  id: string;
  path: string;
  title: string;
  lastModified: string;
  linkCount: number;
  isOrphaned: boolean;
}

export interface DocumentsIndexSchema {
  version: string;
  documents: DocumentSchema[];
}

export interface DocFolderSignatureSchema {
  fileCount: number;
  topLevelFileNames: string[];
  directoryDepth: number;
}

export interface DocFolderSchema {
  id: string;
  path: string;
  signature: DocFolderSignatureSchema;
  documentCount: number;
}

export interface DocFolderIndexSchema {
  version: string;
  docFolder: DocFolderSchema | null;
}
export interface ProjectConfigSchema {
  workspaceId: string;
  docsFolderPath: string | null;
  ignorePatterns: string[];
  schemaVersion: string;
  docFolder?: DocFolderSchema | null;
}

export interface FileIndexEntrySchema {
  id: string;
  hash: string | null;
  lastModified: string;
  size: number;
  isDirectory: boolean;
}

export interface FileIndexSchema {
  version: string;
  lastScan: string | null;
  files: Record<string, FileIndexEntrySchema>;
}