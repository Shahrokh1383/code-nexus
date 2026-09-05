import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { DetectChangesCommand } from '../commands/detect-changes.command';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { RecordHashCommand } from '../commands/record-hash.command';
import { RecordHashHandler } from './record-hash.handler';
import { ILinkedDocumentQueryPort } from '../ports/linked-document-query.port';

export class DetectChangesHandler implements ICommandHandler<DetectChangesCommand, void> {
  constructor(
    private readonly contentReader: IFileContentReader,
    private readonly recordHashHandler: RecordHashHandler,
    private readonly linkedDocQuery: ILinkedDocumentQueryPort
  ) {}

  async execute(command: DetectChangesCommand): Promise<Result<void, string>> {
    try {
      // Link-only tracking: if file has no linked documents, skip processing
      const linkedDocs = await this.linkedDocQuery.findLinkedDocuments(command.filePath);
      if (linkedDocs.length === 0) {
        return Result.ok(undefined);
      }

      const newContent = await this.contentReader.readContent(command.filePath);
      const result = await this.recordHashHandler.execute(
        new RecordHashCommand(command.filePath, newContent)
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