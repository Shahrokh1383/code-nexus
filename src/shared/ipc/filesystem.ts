/**
 * File-system context IPC contract — channel names + pure DTO types.
 * Must stay free of Zod, Node.js imports, and runtime logic 
 */
export const FILESYSTEM_CHANNELS = {
  GET_FILE_TREE: 'filesystem:get-file-tree',
  ADD_IGNORE_PATTERN: 'filesystem:add-ignore-pattern',
  REMOVE_IGNORE_PATTERN: 'filesystem:remove-ignore-pattern',
  GET_IGNORED_FILES: 'filesystem:get-ignored-files',
  TREE_UPDATED: 'filesystem:tree-updated',
} as const;

export interface FileNodeDto {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly lastModified: string;
  readonly isDirectory: boolean;
}

export interface FolderNodeDto {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly children: ReadonlyArray<FileNodeDto | FolderNodeDto>;
}

export interface FileTreeDto {
  readonly root: FolderNodeDto;
  readonly totalFiles: number;
  readonly totalFolders: number;
}

export interface GetFileTreeInput {
  readonly workspaceId: string;
  readonly parentPath?: string;
}

export interface AddIgnorePatternInput {
  readonly workspaceId: string;
  readonly pattern: string;
}

export interface RemoveIgnorePatternInput {
  readonly workspaceId: string;
  readonly pattern: string;
}

export interface GetIgnoredFilesInput {
  readonly workspaceId: string;
}