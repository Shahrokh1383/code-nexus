import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { DetectChangesCommand } from '../commands/detect-changes.command';
import { IFileContentReader } from '../ports/file-content-reader.interface';
import { RecordHashCommand } from '../commands/record-hash.command';
import { RecordHashHandler } from './record-hash.handler';
import { ITrackingRepository } from '../../domain/repository/tracking-repository.interface';
import { DiffCalculatorService } from '../../domain/services/diff-calculator.service';

export class DetectChangesHandler implements ICommandHandler<DetectChangesCommand, void> {
  constructor(
    private readonly contentReader: IFileContentReader,
    private readonly repository: ITrackingRepository,
    private readonly diffService: DiffCalculatorService // FIXED: Inject Domain Service
  ) {}

  async execute(command: DetectChangesCommand): Promise<Result<void, string>> {
    try {
      const newContent = await this.contentReader.readContent(command.filePath);
      const oldContent = await this.contentReader.getPreviousContent(command.filePath);
      
      const recordHandler = new RecordHashHandler(this.repository, this.diffService);
      const result = await recordHandler.execute(
        new RecordHashCommand(command.filePath, newContent, oldContent)
      );

      if (result.isFailure) {
        return Result.fail(result.getError() || 'Failed to detect changes');
      }

      this.contentReader.updateCache(command.filePath, newContent);
      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to detect changes';
      return Result.fail(message);
    }
  }
}