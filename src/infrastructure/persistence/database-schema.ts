export const DATABASE_SCHEMA_VERSION = '1.0';

export interface WorkspaceSchema {
  id: string;
  rootPath: string;
  metadataFolderPath: string;
  createdAt: string;
  lastScanAt: string | null;
}

export interface ProjectConfigSchema {
  workspaceId: string;
  docsFolderPath: string | null;
  ignorePatterns: string[];
  schemaVersion: string;
}