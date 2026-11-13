import { randomUUID } from 'crypto';
import type { EventBus } from '../../../shared/event-bus/event-bus';
import type { Logger } from '../../../shared/logger/logger';
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
    private readonly logger: Logger,
  ) {}

  async recordHash(rootPath: string, filePathStr: string, newContent: string): Promise<void> {
    const filePath = new TrackedFilePath(filePathStr);
    const newHash = HashValue.fromContent(newContent);
    const existing = await this.hashRepo.findHashByPath(rootPath, filePath);

    if (!existing) {
      const fileHash = new FileHash(new FileHashId(randomUUID()), filePath, newHash);
      fileHash.markPending();
      await this.hashRepo.saveHash(rootPath, fileHash);
      try {
        await this.cacheRepo.saveBaseline(rootPath, filePathStr, newContent);
      } catch (err) {
        this.logger.warn('recordHash: failed to save baseline for new file', {
          filePath: filePath.value,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      await this.hashRepo.flush(rootPath);

      this.events.emit('ChangesDetected', {
        filePath: filePath.value,
        oldHash: '',
        newHash: newHash.value,
        diffId: randomUUID(),
      });
      this.logger.debug('recordHash: new file tracked', { filePath: filePath.value });
      return;
    }

    if (existing.hashValue.equals(newHash)) {
      this.logger.debug('recordHash: no change', { filePath: filePath.value });
      return;
    }

    const previousHashValue = existing.hashValue;
    existing.updateHash(newHash);
    existing.markPending();

    try {
      const baseline = await this.cacheRepo.loadBaseline(rootPath, filePathStr);
      const oldContent = baseline ?? '';
      const oldHashForDiff = baseline ? HashValue.fromContent(baseline) : previousHashValue;
      const diff: ContentDiff = this.buildDiff(
        filePath, oldHashForDiff, newHash, oldContent, newContent,
      );
      await this.cacheRepo.saveDiff(rootPath, filePathStr, this.toDiffDto(diff));
    } catch (err) {
      this.logger.warn('recordHash: failed to build/save diff', {
        filePath: filePath.value,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    await this.hashRepo.saveHash(rootPath, existing);
    await this.hashRepo.flush(rootPath);

    this.events.emit('ChangesDetected', {
      filePath: filePath.value,
      oldHash: previousHashValue.value,
      newHash: newHash.value,
      diffId: randomUUID(),
    });
    this.logger.debug('recordHash: file modified', { filePath: filePath.value });
  }

  async detectChanges(rootPath: string, filePath: string): Promise<void> {
    const linked = await this.linkedQuery.findLinkedDocuments(rootPath, filePath);
    if (linked.length === 0) {
      this.logger.debug('detectChanges: no linked documents found, skipping', { filePath });
      return;
    }
    const content = await this.contentReader.readContent(rootPath, filePath);
    await this.recordHash(rootPath, filePath, content);
  }

  async reconcileOnBoot(rootPath: string): Promise<void> {
    const start = Date.now();
    try {
      const allHashes = await this.hashRepo.findAllHashes(rootPath);
      if (allHashes.length === 0) {
        this.logger.debug('reconcileOnBoot: nothing to reconcile', { rootPath });
        return;
      }

      let removed = 0;
      let reDetected = 0;

      for (const hash of allHashes) {
        const filePath = hash.filePath.value;
        if (filePath.startsWith('.doclink/') || filePath === '.doclink') continue;

        try {
          const linkedDocumentIds = await this.linkedQuery.findLinkedDocuments(rootPath, filePath,);
          if (linkedDocumentIds.length === 0) {
            await this.hashRepo.deleteHashByPath(rootPath, hash.filePath);
            removed++;
            continue;
          }
          await this.detectChanges(rootPath, filePath);
          reDetected++;
        } catch (err) {
          this.logger.warn('reconcileOnBoot: per-file failure', {
            filePath,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (removed > 0) {
        await this.hashRepo.flush(rootPath);
      }

      this.logger.info('reconcileOnBoot: finalized', {
        rootPath,
        totalTracked: allHashes.length,
        removed,
        reDetected,
        totalMs: Date.now() - start,
      });
    } catch (error) {
      this.logger.error('reconcileOnBoot: failed', {
        rootPath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async approveCommit(rootPath: string, documentId: string): Promise<void> {
    const linkedFilePaths = await this.linkedQuery.findLinkedFiles(rootPath, documentId);
    if (linkedFilePaths.length === 0) {
      throw new DomainException('NO_LINKED_FILES', 'No linked files found for the selected document');
    }

    const filePaths: TrackedFilePath[] = [];
    const fileHashesForCommit: FileHash[] = [];

    for (const filePathStr of linkedFilePaths) {
      const filePath = new TrackedFilePath(filePathStr);
      let existing = await this.hashRepo.findHashByPath(rootPath, filePath);

      const currentContent = await this.contentReader.readContent(rootPath, filePathStr);

      if (!existing) {
        await this.recordHash(rootPath, filePathStr, currentContent);
        existing = await this.hashRepo.findHashByPath(rootPath, filePath);
        if (!existing) {
          throw new DomainException('NO_HASH_RECORD', `No hash record found for file: ${filePathStr}`);
        }
      }

      const currentHash = HashValue.fromContent(currentContent);
      existing.updateHash(currentHash);
      await this.hashRepo.updatePendingStatus(rootPath, filePath, false, currentHash.value);
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

    await this.hashRepo.flush(rootPath);
    await this.commitRepo.flush(rootPath);
    await this.approvalRepo.flush(rootPath);

    this.events.emit('CommitApproved', {
      commitId: commitId.value,
      documentId,
      filePaths: filePaths.map((p) => p.value),
    });
    this.logger.debug('approveCommit: commit persisted', { documentId });
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