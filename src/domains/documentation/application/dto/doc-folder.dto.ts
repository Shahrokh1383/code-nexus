export interface DocFolderDto {
  id: string;
  path: string;
  signature: {
    fileCount: number;
    topLevelFileNames: string[];
    directoryDepth: number;
  };
  documentCount: number;
}