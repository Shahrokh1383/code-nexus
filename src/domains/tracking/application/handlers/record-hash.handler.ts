import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { RecordHashCommand } from '../commands/record-hash.command';
import { IHashRepository } from '../../domain/repository/hash-repository.interface';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { HashValue } from '../../domain/value-objects/hash-value';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { HashComparisonService } from '../../domain/services/hash-comparison.service';
import { DiffCalculatorService } from '../../domain/services/diff-calculator.service';
import { ContentDiffDto } from '../dto/content-diff.dto';
import { DiffLine } from '../../domain/value-objects/diff-line';
import { FileContentReaderAdapter } from '../../infrastructure/adapters/file-content-reader.adapter';
import { HashRevertedEvent } from '../../domain/events/hash-reverted';

export class RecordHashHandler implements ICommandHandler<RecordHashCommand, void> {
  constructor(
    private readonly repository: IHashRepository,
    private readonly diffService: DiffCalculatorService,
    private readonly contentReader: IFileContentReader
  ) {}

  async execute(command: RecordHashCommand): Promise<Result<void, string>> {
    try {
      const filePath = new FilePath(command.filePath);
      const newHash = HashValue.fromContent(command.newContent);
      const existing = await this.repository.findHashByPath(filePath);

      if (existing) {
        const committedHash = existing.committedHashValue.getOrNull();
        if (committedHash && newHash.equals(committedHash)) {
          // Content reverted to committed version → reset pending status
          existing.revertToCommitted();
          await this.repository.saveHash(existing, null);
          // Notify the renderer so it can refresh pending counts
          await EventBus.getInstance().emit(new HashRevertedEvent(filePath));
          return Result.ok(undefined);
        }

        const comparison = new HashComparisonService();
        const event = comparison.detectChanges(existing.hashValue, newHash, filePath);
        if (!event) return Result.ok(undefined);

        existing.updateHash(newHash);

        let diffDto: ContentDiffDto | null = null;
        const workspaceRoot = this.contentReader.getWorkspaceRoot();
        const baselineContent = await FileContentReaderAdapter.loadBaseline(workspaceRoot, command.filePath);
        const oldContent = baselineContent ?? command.oldContent ?? '';

        try {
          const oldHashForDiff = baselineContent ? HashValue.fromContent(baselineContent) : existing.hashValue;
          const diffEntity = this.diffService.calculate(
            oldContent,
            command.newContent,
            filePath,
            oldHashForDiff,
            newHash
          );
          diffDto = {
            filePath: diffEntity.filePath.value,
            oldHash: diffEntity.oldHash.value,
            newHash: diffEntity.newHash.value,
            addedLines: diffEntity.addedLines.map((l: DiffLine) => ({
              lineNumber: l.lineNumber,
              content: l.content,
              type: l.type,
            })),
            removedLines: diffEntity.removedLines.map((l: DiffLine) => ({
              lineNumber: l.lineNumber,
              content: l.content,
              type: l.type,
            })),
            modifiedLines: diffEntity.modifiedLines.map((l: DiffLine) => ({
              lineNumber: l.lineNumber,
              content: l.content,
              type: l.type,
            })),
          };
        } catch (diffError) {
          console.error('[Tracking] Diff calculation failed for', command.filePath, diffError);
        }

        await this.repository.saveHash(existing, diffDto);
        await EventBus.getInstance().emit(event);
      } else {
        const fileHash = new FileHash(new FileHashId(UuidGenerator.generate()), filePath, newHash);
        await this.repository.saveHash(fileHash, null);
      }

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record hash';
      console.error('[Tracking] RecordHashHandler failed:', message, error);
      return Result.fail(message);
    }
  }
}