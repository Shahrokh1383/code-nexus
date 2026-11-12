import { DomainException } from '../../../shared/errors/domain-exception';
import type {
  FileHashDto,
  PendingStatusDto,
  GranularCommitDto,
  FileDiffResult,
} from '@shared/ipc/tracking';
import { TrackedFilePath } from '../domain/TrackedFilePath';
import { HashValue } from '../domain/FileHash';
import { TrackingJsonRepository } from '../infrastructure/TrackingJsonRepository';
import { CommitsJsonRepository } from '../infrastructure/CommitsJsonRepository';
import { DocumentCommitApprovalJsonRepository } from '../infrastructure/DocumentCommitApprovalJsonRepository';
import { BaselineDiffCacheJsonRepository } from '../infrastructure/BaselineDiffCacheJsonRepository';
import { FileSystemContentReader } from '../infrastructure/FileSystemContentReader';
import { DiffCalculator } from '../infrastructure/DiffCalculator';
import { LinkedDocumentQuery } from '../infrastructure/LinkedDocumentQuery';

export class QueryService {
  constructor(
    private readonly hashRepo: TrackingJsonRepository,
    private readonly commitRepo: CommitsJsonRepository,
    private readonly approvalRepo: DocumentCommitApprovalJsonRepository,
    private readonly cacheRepo: BaselineDiffCacheJsonRepository,
    private readonly linkedQuery: LinkedDocumentQuery,
    private readonly contentReader: FileSystemContentReader,
    private readonly diffCalc: DiffCalculator,
  ) {}

  async getPendingChanges(rootPath: string, documentId?: string): Promise<FileHashDto[]> {
    if (!documentId) return [];

    const linkedFiles = await this.linkedQuery.findLinkedFiles(rootPath, documentId);
    const approvals = await this.approvalRepo.findByDocument(rootPath, { value: documentId });
    const latest = approvals.length > 0 ? approvals[approvals.length - 1] : null;

    // No commit yet: every linked file is pending. Resolve hash from tracker
    // if present, otherwise re-hash from disk so a failed detection cannot
    // hide a freshly linked file.
    if (!latest) {
      const result: FileHashDto[] = [];
      for (const filePathStr of linkedFiles) {
        const tracked = await this.hashRepo.findHashByPath(
          rootPath, new TrackedFilePath(filePathStr),
        );
        let hashValue: string | null = tracked?.hashValue.value ?? null;
        if (hashValue === null) {
          try {
            const content = await this.contentReader.readContent(rootPath, filePathStr);
            hashValue = HashValue.fromContent(content).value;
          } catch {
            hashValue = null;
          }
        }
        if (hashValue !== null) {
          result.push({
            filePath: filePathStr,
            hashValue,
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
      const tracked = await this.hashRepo.findHashByPath(
        rootPath, new TrackedFilePath(filePathStr),
      );
      if (!tracked) continue;
      const committedHash = commit.fileHashes.find((fh) => fh.filePath.value === filePathStr);

      // Authoritative source: re-read the file from disk and hash it. This
      // bypasses any stale state in tracking-index.json (e.g. when the fs
      // watcher did not fire and recordHash never ran), so the pending list
      // is always truthful as of this query.
      let diskHashValue: string | null = null;
      try {
        const content = await this.contentReader.readContent(rootPath, filePathStr);
        diskHashValue = HashValue.fromContent(content).value;
      } catch {
        diskHashValue = null; // file missing/unreadable — fall back to tracker
      }
      const effectiveHashValue = diskHashValue ?? tracked.hashValue.value;
      const committedHashValue = committedHash?.hashValue.value ?? null;
      const isPending =
        committedHashValue === null || effectiveHashValue !== committedHashValue;

      if (isPending) {
        result.push({
          filePath: tracked.filePath.value,
          hashValue: effectiveHashValue,
          committedAt: committedHash ? commit.committedAt.toISOString() : null,
          status: 'PENDING',
        });
      }
    }
    return result;
  }

  async getAllPendingStatus(rootPath: string): Promise<PendingStatusDto[]> {
    const allHashes = await this.hashRepo.findAllHashes(rootPath);
    const approvalsCache = new Map<
      string,
      Awaited<ReturnType<DocumentCommitApprovalJsonRepository['findByDocument']>>
    >();
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
    // Self-healing diff: compute from the persisted commit baseline against
    // the current file on disk. Does not rely on cache diff or on
    // tracking-index.json's isPending flag, so it is correct even when the
    // fs watcher failed to fire.
    const baseline = await this.cacheRepo.loadBaseline(rootPath, filePathStr);
    if (baseline === null) return 'CACHE_MISSING';

    let currentContent: string;
    try {
      currentContent = await this.contentReader.readContent(rootPath, filePathStr);
    } catch {
      return null;
    }

    const oldHash = HashValue.fromContent(baseline);
    const newHash = HashValue.fromContent(currentContent);
    if (oldHash.equals(newHash)) return null;

    const oldLines = baseline === '' ? [] : baseline.split('\n');
    const newLines = currentContent === '' ? [] : currentContent.split('\n');
    const { added, removed, modified } = this.diffCalc.computeDiff(oldLines, newLines);

    return {
      filePath: filePathStr,
      oldHash: oldHash.value,
      newHash: newHash.value,
      addedLines: added.map((l) => ({
        lineNumber: l.lineNumber, content: l.content, type: l.type as string,
      })),
      removedLines: removed.map((l) => ({
        lineNumber: l.lineNumber, content: l.content, type: l.type as string,
      })),
      modifiedLines: modified.map((l) => ({
        lineNumber: l.lineNumber, content: l.content, type: l.type as string,
      })),
    };
  }
}