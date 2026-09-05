import { JsonDatabase } from '../../../../src/infrastructure/persistence/json-database';
import { WorkspaceJsonRepository } from '../../../../src/domains/project/infrastructure/repository/workspace-json.repository';
import { ProjectConfigJsonRepository } from '../../../../src/domains/project/infrastructure/repository/project-config-json.repository';
import { FileSystemJsonRepository } from '../../../../src/domains/filesystem/infrastructure/repository/filesystem-json.repository';
import { ChokidarAdapter } from '../../../../src/domains/filesystem/infrastructure/adapters/chokidar.adapter';
import { TrackingJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/tracking-json.repository';
import { CommitsJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/commits-json.repository';
import { DocumentCommitApprovalJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/document-commit-approval-json.repository';
import { FileSystemContentReaderAdapter } from '../../../../src/domains/tracking/infrastructure/adapters/file-system-content-reader.adapter';
import { DiffCalculatorService } from '../../../../src/domains/tracking/domain/services/diff-calculator.service';
import { CommitMatcherService } from '../../../../src/domains/tracking/domain/services/commit-matcher.service';
import { LinkedDocumentQueryAdapter } from './adapter';
import { BaselineDiffCacheJsonRepository } from '../../../../src/domains/tracking/infrastructure/repository/baseline-diff-cache-json.repository';

export interface WorkspaceContext {
  rootPath: string;
  db: JsonDatabase;
  workspaceRepo: WorkspaceJsonRepository;
  configRepo: ProjectConfigJsonRepository;
  fileSystemRepo: FileSystemJsonRepository;
  fileWatcher: ChokidarAdapter;
  hashRepo: TrackingJsonRepository;
  commitRepo: CommitsJsonRepository;
  approvalRepo: DocumentCommitApprovalJsonRepository;
  linkedDocQuery: LinkedDocumentQueryAdapter;
  contentReader: FileSystemContentReaderAdapter;
  diffService: DiffCalculatorService;
  commitMatcher: CommitMatcherService;
  cacheRepo: BaselineDiffCacheJsonRepository;
}

let currentContext: WorkspaceContext | null = null;

export function setWorkspaceContext(context: WorkspaceContext): void {
  currentContext = context;
}

export function getWorkspaceContext(): WorkspaceContext | null {
  return currentContext;
}

export function clearWorkspaceContext(): void {
  currentContext = null;
}