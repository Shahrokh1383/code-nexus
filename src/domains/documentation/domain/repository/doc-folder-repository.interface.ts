import { DocFolderId } from '../value-objects/doc-folder-id';
import { DocFolder } from '../entities/doc-folder';

export interface IDocFolderRepository {
  findByWorkspaceId(workspaceId: string): Promise<DocFolder | null>;
  save(docFolder: DocFolder): Promise<void>;
  delete(id: DocFolderId): Promise<void>;
}