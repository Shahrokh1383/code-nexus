import { TrackingJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/tracking-json.repository';
import { CommitsJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/commits-json.repository';
import { DocumentCommitApprovalJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/document-commit-approval-json.repository';
import { FileContentReaderAdapter } from '../../../../src/domains/tracking/infrastructure/adapters/file-content-reader.adapter';
import { DiffCalculatorAdapter } from '../../../../src/domains/tracking/infrastructure/adapters/diff-calculator.adapter';
import { DiffCalculatorService } from '../../../../src/domains/tracking/domain/services/diff-calculator.service';
import { CommitMatcherService } from '../../../../src/domains/tracking/domain/services/commit-matcher.service';
import { ILinkedDocumentQueryPort } from '../../../../src/domains/tracking/application/ports/linked-document-query.port';
import { LinkedDocumentQueryAdapter } from './adapter';
import { setCurrentWorkspaceRoot } from './workspace-context';

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
  setCurrentWorkspaceRoot(rootPath);
  try {
    return await handler(rootPath);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function createTrackingDependencies(rootPath: string) {
  const hashRepo = new TrackingJsonRepository(rootPath);
  const commitRepo = new CommitsJsonRepository(rootPath);
  const approvalRepo = new DocumentCommitApprovalJsonRepository(rootPath);
  const linkedDocQuery: ILinkedDocumentQueryPort = new LinkedDocumentQueryAdapter(rootPath);
  const contentReader = new FileContentReaderAdapter(rootPath);
  const diffService = new DiffCalculatorService(new DiffCalculatorAdapter());
  const commitMatcher = new CommitMatcherService();

  return { hashRepo, commitRepo, approvalRepo, linkedDocQuery, contentReader, diffService, commitMatcher };
}