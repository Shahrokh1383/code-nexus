import { createServiceToken, type ServiceToken } from '../../../../kernel/service-container';
import type { FileTreeDto } from '@shared/ipc/filesystem';

/**
 * Public file-system module contract. The workspace module
 * resolves this to activate/deactivate the file session; IPC handlers
 * resolve it for channel execution.
 */
export interface FileSystemServiceContract {
  activateSession(rootPath: string, ignorePatterns: readonly string[]): Promise<void>;
  deactivateSession(): Promise<void>;
  getActiveRootPath(): string | null;
  getFileTree(workspaceId: string, parentPath?: string): Promise<FileTreeDto>;
  getIgnoredFiles(workspaceId: string): Promise<string[]>;
  addIgnorePattern(workspaceId: string, pattern: string): Promise<void>;
  removeIgnorePattern(workspaceId: string, pattern: string): Promise<void>;
}

export const FileSystemServiceToken: ServiceToken<FileSystemServiceContract> =
  createServiceToken<FileSystemServiceContract>('FileSystemService');