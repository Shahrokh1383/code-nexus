/**
 * Port for reading file content from the filesystem.
 * Implemented by the FileSystem context's infrastructure layer.
 * Used by Tracking context to avoid direct fs access.
 */
export interface IFileContentReader {
  readContent(filePath: string): Promise<string>;
}