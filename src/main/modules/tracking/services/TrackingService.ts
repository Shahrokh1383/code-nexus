import { randomUUID } from 'crypto';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import { DomainException } from '../../../shared/errors/domain-exception';
import { FileHash, FileHashId, HashValue } from '../domain/FileHash';
import { TrackedFilePath } from '../domain/TrackedFilePath';
import { CommitId, GranularCommit } from '../domain/GranularCommit';
import { DocumentCommitApproval } from '../domain/DocumentCommitApproval';
import { ContentDiff, DiffId } from '../domain/ContentDiff';
import { TrackingJsonRepository } from '../infrastructure/TrackingJsonRepository';
import { CommitsJsonRepository } from '../infrastructure/CommitsJsonRepository';
import { DocumentCommitApprovalJsonRepository } from '../infrastructure/DocumentCommitApprovalJsonRepository';
import { BaselineDiffCacheJsonRepository } from '../infrastructure/BaselineDiffCacheJsonRepository';
import { FileSystemContentReader } from '../infrastructure/FileSystemContentReader';
import { DiffCalculator } from '../infrastructure/DiffCalculator';
import { LinkedDocumentQuery } from '../infrastructure/LinkedDocumentQuery';

export class TrackingService {
  constructor(
    private readonly hashRepo: TrackingJsonRepository,
    private readonly commitRepo: CommitsJsonRepository,
    private readonly approvalRepo: DocumentCommitApprovalJsonRepository,
    private readonly cacheRepo: BaselineDiffCacheJsonRepository,
    private readonly contentReader: FileSystemContentReader,
    private readonly diffCalc: DiffCalculator,
    private readonly linkedQuery: LinkedDocumentQuery,
    private readonly events: EventBus,
  ) {}

  async recordHash(rootPath: string, filePathStr: string, newContent: string): Promise<void> {
    const filePath = new TrackedFilePath(filePathStr);
    const newHash = HashValue.fromContent(newContent);
    const existing = await this.hashRepo.findHashByPath(rootPath, filePath);

    if (!existing) {
      const fileHash = new FileHash(new FileHashId(randomUUID()), filePath, newHash);
      await this.hashRepo.saveHash(rootPath, fileHash);
      try {
        await this.cacheRepo.saveBaseline(rootPath, filePathStr, newContent);
      } catch {
        // Cache is best-effort — metadata persisted regardless (legacy behavior).
      }
      return;
    }

    if (existing.hashValue.equals(newHash)) return;

    const eventDiffId = randomUUID();
    existing.updateHash(newHash);
    existing.markPending();

    try {
      const baseline = await this.cacheRepo.loadBaseline(rootPath, filePathStr);
      const oldContent = baseline ?? '';
      const oldHash = baseline ? HashValue.fromContent(baseline) : existing.hashValue;
      const diff: ContentDiff = this.buildDiff(filePath, oldHash, newHash, oldContent, newContent);
      await this.cacheRepo.saveDiff(rootPath, filePathStr, this.toDiffDto(diff));
    } catch {
      // Cache is best-effort (legacy behavior preserved — metadata continues).
    }

    await this.hashRepo.saveHash(rootPath, existing);
    this.events.emit('ChangesDetected', {
      filePath: filePath.value,
      oldHash: existing.hashValue.value,
      newHash: newHash.value,
      diffId: eventDiffId,
    });
  }

  async detectChanges(rootPath: string, filePath: string): Promise<void> {
    const linked = await this.linkedQuery.findLinkedDocuments(rootPath, filePath);
    if (linked.length === 0) return; // Link-only tracking (legacy behavior).
    const content = await this.contentReader.readContent(rootPath, filePath);
    await this.recordHash(rootPath, filePath, content);
  }

  async approveCommit(rootPath: string, documentId: string): Promise<void> {
    const linkedFilePaths = await this.linkedQuery.findLinkedFiles(rootPath, documentId);
    if (linkedFilePaths.length === 0) {
      throw new DomainException(
        'NO_LINKED_FILES',
        'No linked files found for the selected document',
      );
    }

    const filePaths: TrackedFilePath[] = [];
    const fileHashesForCommit: FileHash[] = [];

    for (const filePathStr of linkedFilePaths) {
      const filePath = new TrackedFilePath(filePathStr);
      const existing = await this.hashRepo.findHashByPath(rootPath, filePath);
      if (!existing) {
        throw new DomainException(
          'NO_HASH_RECORD',
          `No hash record found for file: ${filePathStr}`,
        );
      }

      const currentContent = await this.contentReader.readContent(rootPath, filePathStr);
      await this.hashRepo.updatePendingStatus(
        rootPath, filePath, false, existing.hashValue.value,
      );
      await this.cacheRepo.clearCacheForFile(rootPath, filePathStr);
      await this.cacheRepo.saveBaseline(rootPath, filePathStr, currentContent);
      filePaths.push(filePath);
      fileHashesForCommit.push(existing);
    }

    const commitId = new CommitId(randomUUID());
    const committedAt = new Date();
    const commit = new GranularCommit(commitId, fileHashesForCommit, committedAt);
    await this.commitRepo.save(rootPath, commit);

    const approval = new DocumentCommitApproval(
      { value: documentId }, commitId, committedAt,
    );
    await this.approvalRepo.save(rootPath, approval);

    this.events.emit('CommitApproved', {
      commitId: commitId.value,
      documentId,
      filePaths: filePaths.map((p) => p.value),
    });
  }

  private buildDiff(
    filePath: TrackedFilePath,
    oldHash: HashValue,
    newHash: HashValue,
    oldContent: string,
    newContent: string,
  ): ContentDiff {
    const oldLines = oldContent === '' ? [] : oldContent.split('\n');
    const newLines = newContent === '' ? [] : newContent.split('\n');
    const { added, removed, modified } = this.diffCalc.computeDiff(oldLines, newLines);
    return new ContentDiff(
      new DiffId(randomUUID()), filePath, oldHash, newHash, added, removed, modified,
    );
  }

  private toDiffDto(diff: ContentDiff) {
    return {
      filePath: diff.filePath.value,
      oldHash: diff.oldHash.value,
      newHash: diff.newHash.value,
      addedLines: diff.addedLines.map((l) => ({
        lineNumber: l.lineNumber, content: l.content, type: l.type as string,
      })),
      removedLines: diff.removedLines.map((l) => ({
        lineNumber: l.lineNumber, content: l.content, type: l.type as string,
      })),
      modifiedLines: diff.modifiedLines.map((l) => ({
        lineNumber: l.lineNumber, content: l.content, type: l.type as string,
      })),
    };
  }
}