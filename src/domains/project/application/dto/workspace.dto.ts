export interface WorkspaceDto {
  id: string;
  rootPath: string;
  metadataFolderPath: string;
  createdAt: string;
  lastScanAt: string | null;
}