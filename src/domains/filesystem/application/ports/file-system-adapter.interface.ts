import { FileMetadata } from '../../domain/services/scan-project.service';

export interface IFileSystemAdapter {
  scanDirectory(rootPath: string): Promise<FileMetadata[]>;
}