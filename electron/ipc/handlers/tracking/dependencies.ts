import { getWorkspaceContext } from './workspace-context';
import { PathUtils } from '../../../../src/domains/shared-kernel/utils/path-utils';

export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function validateWorkspaceId(workspaceId: unknown): string | null {
  if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) return null;
  return workspaceId.trim();
}

export async function handleIpcCall<T>(
  workspaceId: unknown,
  handler: (rootPath: string) => Promise<IpcResponse<T>>
): Promise<IpcResponse<T>> {
  const rootPath = validateWorkspaceId(workspaceId);
  if (!rootPath) return { success: false, error: 'Invalid workspace ID' };
  
  try {
    return await handler(rootPath);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function createTrackingDependencies(rootPath: string) {
  const ctx = getWorkspaceContext();
  const normalizedRoot = PathUtils.normalize(rootPath);
  if (!ctx || ctx.rootPath !== normalizedRoot) {
    throw new Error('Workspace context is not initialized or path mismatch.');
  }
  
  return {
    hashRepo: ctx.hashRepo,
    commitRepo: ctx.commitRepo,
    approvalRepo: ctx.approvalRepo,
    linkedDocQuery: ctx.linkedDocQuery,
    contentReader: ctx.contentReader,
    diffService: ctx.diffService,
    commitMatcher: ctx.commitMatcher
  };
}