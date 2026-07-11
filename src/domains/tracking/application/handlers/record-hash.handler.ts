import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { RecordHashCommand } from '../commands/record-hash.command';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { HashValue } from '../../domain/value-objects/hash-value';
import { FilePath } from '../../../filesystem/domain/value-objects/file-path';
import { FileHash } from '../../domain/entities/file-hash';
import { FileHashId } from '../../domain/value-objects/file-hash-id';
import { UuidGenerator } from '../../../shared-kernel/utils/uuid-generator';
import { HashComparisonService } from '../../domain/services/hash-comparison.service';
import { ReviewRequiredEvent } from '../../domain/events/review-required';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';

export class RecordHashHandler implements ICommandHandler<RecordHashCommand, void> {
  constructor(
    private readonly repository: ITrackingRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(command: RecordHashCommand): Promise<Result<void, string>> {
    try {
      const filePath = new FilePath(command.filePath);
      const newHash = HashValue.fromContent(command.content);

      const existing = await this.repository.findHashByPath(filePath);

      if (existing) {
        const comparison = new HashComparisonService();
        const event = comparison.detectChanges(existing.hashValue, newHash, filePath);

        if (event) {
          existing.updateHash(newHash);
          await this.repository.saveHash(existing);
          await EventBus.getInstance().emit(event);
          await this.emitReviewRequired(filePath);
        }
      } else {
        const fileHash = new FileHash(
          new FileHashId(UuidGenerator.generate()),
          filePath,
          newHash
        );
        await this.repository.saveHash(fileHash);
      }

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record hash';
      return Result.fail(message);
    }
  }

  private async emitReviewRequired(filePath: FilePath): Promise<void> {
    const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(filePath.value);
    for (const docId of linkedDocs) {
      await EventBus.getInstance().emit(
        new ReviewRequiredEvent(docId, filePath, 'OUTDATED')
      );
    }
  }
}