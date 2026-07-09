import { FileNodeDto } from './file-node.dto';

export interface FolderNodeDto {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly children: ReadonlyArray<FileNodeDto | FolderNodeDto>;
}