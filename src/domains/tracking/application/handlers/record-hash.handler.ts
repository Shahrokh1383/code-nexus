import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { RecordHashCommand } from '../commands/record-hash.command';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { IBaselineDiffCacheRepository } from '../../domain/repository/baseline-diff-cache-repository.interface';
import { HashValue } from '../../domain/value-objects/hash-value';
import { TrackedFilePath } from '../../domain/value-objects/tracked-file-path';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { HashComparisonService } from '../../domain/services/hash-comparison.service';
import { DiffCalculatorService } from '../../domain/services/diff-calculator.service';
import { ContentDiffDto } from '../dto/content-diff.dto';
import { DiffLine } from '../../domain/value-objects/diff-line';

export class RecordHashHandler implements ICommandHandler<RecordHashCommand, void> {
  constructor(
    private readonly repository: IHashRepository,
    private readonly diffService: DiffCalculatorService,
    private readonly cacheRepo: IBaselineDiffCacheRepository
  ) {}

  async execute(command: RecordHashCommand): Promise<Result<void, string>> {
    try {
      const filePath = new TrackedFilePath(command.filePath);
      const newHash = HashValue.fromContent(command.newContent);
      const existing = await this.repository.findHashByPath(filePath);

      if (existing) {
        const comparison = new HashComparisonService();
        const event = comparison.detectChanges(existing.hashValue, newHash, filePath);
        if (!event) return Result.ok(undefined);

        existing.updateHash(newHash);

        let diffDto: ContentDiffDto | null = null;
        const baselineContent = await this.cacheRepo.loadBaseline(command.filePath);
        const oldContent = baselineContent ?? command.oldContent ?? '';

        try {
          const oldHashForDiff = baselineContent ? HashValue.fromContent(baselineContent) : existing.hashValue;
          const diffEntity = this.diffService.calculate(oldContent, command.newContent, filePath, oldHashForDiff, newHash);

          const mapDiffLines = (lines: DiffLine[]) => lines.map(l => ({ lineNumber: l.lineNumber, content: l.content, type: l.type }));
          diffDto = {
            filePath: diffEntity.filePath.value,
            oldHash: diffEntity.oldHash.value,
            newHash: diffEntity.newHash.value,
            addedLines: mapDiffLines(diffEntity.addedLines),
            removedLines: mapDiffLines(diffEntity.removedLines),
            modifiedLines: mapDiffLines(diffEntity.modifiedLines),
          };
        } catch (diffError) {
          console.error('[Tracking] Diff calculation failed for', command.filePath, diffError);
        }

        // Save diff to separate cache repository, not inside .doclink
        if (diffDto) {
          await this.cacheRepo.saveDiff(command.filePath, diffDto);
        }

        // Save hash metadata only and mark as pending
        await this.repository.saveHash(existing);
        await this.repository.updatePendingStatus(filePath, true);
        await EventBus.getInstance().emit(event);
      } else {
        const fileHash = new FileHash(new FileHashId(UuidGenerator.generate()), filePath, newHash);
        await this.repository.saveHash(fileHash);
        // New file is not pending unless explicitly linked; keep false for now
      }

      return Result.ok(undefined);
    } catch (error) {
      console.error('[Tracking] RecordHashHandler failed:', error);
      return Result.fail(error instanceof Error ? error.message : 'Failed to record hash');
    }
  }
}