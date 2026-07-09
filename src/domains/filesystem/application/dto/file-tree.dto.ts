import { FolderNodeDto } from './folder-node.dto';

export interface FileTreeDto {
  readonly root: FolderNodeDto;
  readonly totalFiles: number;
  readonly totalFolders: number;
}