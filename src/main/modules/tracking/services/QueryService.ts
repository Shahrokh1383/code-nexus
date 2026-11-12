import { DomainException } from '../../../shared/errors/domain-exception';
import type {
  FileHashDto,
  PendingStatusDto,
  GranularCommitDto,
  FileDiffResult,
} from '@shared/ipc/tracking';
import { TrackedFilePath } from '../domain/TrackedFilePath';
import { TrackingJsonRepository } from '../infrastructure/TrackingJsonRepository';
import { CommitsJsonRepository } from '../infrastructure/CommitsJsonRepository';
import { DocumentCommitApprovalJsonRepository } from '../infrastructure/DocumentCommitApprovalJsonRepository';
import { BaselineDiffCacheJsonRepository } from '../infrastructure/BaselineDiffCacheJsonRepository';
import { LinkedDocumentQuery } from '../infrastructure/LinkedDocumentQuery';

export class QueryService {
  constructor(
    private readonly hashRepo: TrackingJsonRepository,
    private readonly commitRepo: CommitsJsonRepository,
    private readonly approvalRepo: DocumentCommitApprovalJsonRepository,
    private readonly cacheRepo: BaselineDiffCacheJsonRepository,
    private readonly linkedQuery: LinkedDocumentQuery,
  ) {}

  async getPendingChanges(rootPath: string, documentId?: string): Promise<FileHashDto[]> {
    if (!documentId) return []; // Legacy: Result.ok([]) — NOT an error.

    const linkedFiles = await this.linkedQuery.findLinkedFiles(rootPath, documentId);
    const approvals = await this.approvalRepo.findByDocument(rootPath, { value: documentId });
    const latest = approvals.length > 0 ? approvals[approvals.length - 1] : null;

    if (!latest) {
      const result: FileHashDto[] = [];
      for (const filePathStr of linkedFiles) {
        const hash = await this.hashRepo.findHashByPath(rootPath, new TrackedFilePath(filePathStr));
        if (hash) {
          result.push({
            filePath: hash.filePath.value,
            hashValue: hash.hashValue.value,
            committedAt: null,
            status: 'PENDING',
          });
        }
      }
      return result;
    }

    const commit = await this.commitRepo.findById(rootPath, latest.commitId);
    if (!commit) {
      throw new DomainException('APPROVED_COMMIT_NOT_FOUND', 'Approved commit not found');
    }

    const result: FileHashDto[] = [];
    for (const filePathStr of linkedFiles) {
      const currentHash = await this.hashRepo.findHashByPath(rootPath, new TrackedFilePath(filePathStr));
      if (!currentHash) continue;
      const committedHash = commit.fileHashes.find((fh) => fh.filePath.value === filePathStr);
      const isPending = !committedHash || !currentHash.hashValue.equals(committedHash.hashValue);
      if (isPending) {
        result.push({
          filePath: currentHash.filePath.value,
          hashValue: currentHash.hashValue.value,
          committedAt: committedHash ? commit.committedAt.toISOString() : null,
          status: 'PENDING',
        });
      }
    }
    return result;
  }

  async getAllPendingStatus(rootPath: string): Promise<PendingStatusDto[]> {
    const allHashes = await this.hashRepo.findAllHashes(rootPath);
    const approvalsCache = new Map<string, ReturnType<DocumentCommitApprovalJsonRepository['findByDocument']> extends Promise<infer T> ? T : never>();
    const commitCache = new Map<string, Awaited<ReturnType<CommitsJsonRepository['findById']>>>();
    const countMap: Record<string, number> = {};

    for (const hash of allHashes) {
      const linkedDocs = await this.linkedQuery.findLinkedDocuments(rootPath, hash.filePath.value);
      for (const docId of linkedDocs) {
        if (!approvalsCache.has(docId)) {
          approvalsCache.set(docId, await this.approvalRepo.findByDocument(rootPath, { value: docId }));
        }
        const approvals = approvalsCache.get(docId)!;
        const latest = approvals.length > 0 ? approvals[approvals.length - 1] : null;

        if (!latest) {
          countMap[docId] = (countMap[docId] || 0) + 1;
          continue;
        }
        const commitId = latest.commitId.value;
        if (!commitCache.has(commitId)) {
          commitCache.set(commitId, await this.commitRepo.findById(rootPath, latest.commitId));
        }
        const commit = commitCache.get(commitId) ?? null;
        if (!commit) {
          countMap[docId] = (countMap[docId] || 0) + 1;
          continue;
        }
        const committedHash = commit.fileHashes.find((fh) => fh.filePath.value === hash.filePath.value);
        if (!committedHash || !hash.hashValue.equals(committedHash.hashValue)) {
          countMap[docId] = (countMap[docId] || 0) + 1;
        }
      }
    }

    return Object.entries(countMap).map(([documentId, pendingCount]) => ({
      documentId, pendingCount,
    }));
  }

  async getCommitHistory(rootPath: string, documentId: string): Promise<GranularCommitDto[]> {
    const approvals = await this.approvalRepo.findByDocument(rootPath, { value: documentId });
    const seen = new Set<string>();
    const dtos: GranularCommitDto[] = [];

    for (const approval of approvals) {
      if (seen.has(approval.commitId.value)) continue;
      seen.add(approval.commitId.value);
      const commit = await this.commitRepo.findById(rootPath, approval.commitId);
      if (commit) {
        dtos.push({
          id: commit.id.value,
          documentId,
          filePaths: commit.getLinkedFiles().map((p) => p.value),
          committedAt: commit.committedAt.toISOString(),
          status: 'APPROVED',
        });
      }
    }
    dtos.sort((a, b) => b.committedAt.localeCompare(a.committedAt));
    return dtos;
  }

  async getFileDiff(rootPath: string, filePathStr: string): Promise<FileDiffResult> {
    const filePath = new TrackedFilePath(filePathStr);
    const hashEntry = await this.hashRepo.findHashByPath(rootPath, filePath);
    if (!hashEntry || !hashEntry.isPending) return null;
    const diff = await this.cacheRepo.loadDiff(rootPath, filePathStr);
    if (diff === null) return 'CACHE_MISSING';
    return diff;
  }
}