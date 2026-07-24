/**
 * Port for scanning the file system to detect and read documentation folders.
 * Implemented in the Infrastructure layer.
 */
export interface IDocumentFolderScannerPort {
  /**
   * Checks if a relative path exists within the workspace.
   */
  exists(relativePath: string): Promise<boolean>;

  /**
   * Checks if a relative path is a directory.
   */
  isDirectory(relativePath: string): Promise<boolean>;

  /**
   * Lists immediate subdirectories of a relative path.
   * Returns directory names only (not full paths).
   */
  listDirectories(relativePath: string): Promise<string[]>;

  /**
   * Scans a folder recursively and returns all files and directories.
   * Paths are relative to the scanned folder root.
   */
  scanFolder(relativePath: string): Promise<
    Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      lastModified: Date;
    }>
  >;
}

export interface IDocumentFolderScannerPort {
  exists(relativePath: string): Promise<boolean>;
  isDirectory(relativePath: string): Promise<boolean>;
  listDirectories(relativePath: string): Promise<string[]>;
  scanFolder(relativePath: string): Promise<
    Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      lastModified: Date;
    }>
  >;

  /**
   * High-performance method that scans the workspace recursively for all directories
   * without fetching file stats (mtime/size). Prevents CPU bottlenecks.
   * Respects ignore patterns.
   */
  scanWorkspaceForCandidates(ignorePatterns: string[]): Promise<
    Array<{
      path: string;
      files: Array<{ name: string; path: string; isDirectory: boolean }>;
    }>
  >;
}