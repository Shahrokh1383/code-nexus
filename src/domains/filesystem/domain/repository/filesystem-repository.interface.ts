import { IRepository } from '../../../shared-kernel/repository/repository.interface';
import { FileNode } from '../entities/file-node';
import { FolderNode } from '../entities/folder-node';
import { FilePath } from '../value-objects/file-path';

export interface IFileSystemRepository extends IRepository<FileNode | FolderNode> {
  findByPath(path: FilePath): Promise<FileNode | FolderNode | null>;
  findAll(): Promise<Array<FileNode | FolderNode>>;
  findChildrenOf(parentPath: FilePath): Promise<Array<FileNode | FolderNode>>;
  findByPattern(pattern: string): Promise<FileNode[]>;
  clear(): Promise<void>;
  clearAndSaveAll(root: FolderNode): Promise<void>;
}