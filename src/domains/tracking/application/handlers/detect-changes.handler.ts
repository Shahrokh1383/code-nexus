import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { DetectChangesCommand } from '../commands/detect-changes.command';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';
import { RecordHashCommand } from '../commands/record-hash.command';
import { RecordHashHandler } from './record-hash.handler';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';

export class DetectChangesHandler implements ICommandHandler<DetectChangesCommand, void> {
  constructor(
    private readonly contentReader: IFileContentReader,
    private readonly repository: ITrackingRepository,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(command: DetectChangesCommand): Promise<Result<void, string>> {
    try {
      const content = await this.contentReader.readContent(command.filePath);
      const recordHandler = new RecordHashHandler(this.repository, this.linkedDocQuery);
      const result = await recordHandler.execute(
        new RecordHashCommand(command.filePath, content)
      );

      if (result.isFailure) {
        return Result.fail(result.getError() || 'Failed to detect changes');
      }

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to detect changes';
      return Result.fail(message);
    }
  }
}