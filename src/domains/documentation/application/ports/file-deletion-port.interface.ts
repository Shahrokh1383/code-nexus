/**
 * Port for deleting physical files from the file system.
 * Implemented in the Infrastructure layer.
 */
export interface IFileDeletionPort {
  /**
   * Deletes a file at the given relative path.
   */
  deleteFile(relativePath: string): Promise<void>;
}