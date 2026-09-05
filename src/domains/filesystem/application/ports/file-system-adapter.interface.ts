export interface FileMetadata {
  readonly path: string;
  readonly name: string;
  readonly lastModified: Date;
  readonly isDirectory: boolean;
}

export interface IFileSystemAdapter {
  readDir(dirPath: string): Promise<FileMetadata[]>;
  readDirRecursively(dirPath: string): Promise<FileMetadata[]>;
  stat(filePath: string): Promise<FileMetadata>;
  exists(filePath: string): boolean;
  readFile(absolutePath: string): Promise<string>;
}