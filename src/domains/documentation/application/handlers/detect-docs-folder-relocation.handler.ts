import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { IDocFolderRepository } from '../../domain/repository/doc-folder-repository.interface';
import { DocsFolderDetectorService } from '../../domain/services/docs-folder-detector.service';
import { CandidateFolder } from '../../domain/services/docs-folder-detector.service';
import { DetectDocsFolderRelocationCommand } from '../commands/detect-docs-folder-relocation.command';
import { IDocumentFolderScannerPort } from '../ports/document-folder-scanner-port.interface';

export class DetectDocsFolderRelocationHandler
  implements ICommandHandler<DetectDocsFolderRelocationCommand, void>
{
  constructor(
    private readonly docFolderRepo: IDocFolderRepository,
    private readonly configRepo: IProjectConfigRepository,
    private readonly detectorService: DocsFolderDetectorService,
    private readonly scanner: IDocumentFolderScannerPort
  ) {}

  async execute(
    command: DetectDocsFolderRelocationCommand
  ): Promise<Result<void, string>> {
    try {
      const existingDocFolder = await this.docFolderRepo.findByWorkspaceId(
        command.workspaceId
      );

      if (!existingDocFolder) {
        return Result.fail('No docs folder registered for this workspace');
      }

      const exists = await this.scanner.exists(existingDocFolder.path);
      if (exists) {
        return Result.ok(void 0);
      }

      const candidates = await this.buildCandidates(command.workspaceId);
      const detectResult = this.detectorService.detect(
        candidates,
        existingDocFolder
      );

      if (detectResult.isFailure) {
        return Result.fail(
          detectResult.getError() || 'Failed to detect relocated docs folder'
        );
      }

      const relocatedFolder = detectResult.getValue();
      if (!relocatedFolder) {
        return Result.fail('Failed to detect relocated docs folder');
      }

      if (relocatedFolder.path !== existingDocFolder.path) {
        await this.docFolderRepo.save(relocatedFolder);

        const workspaceId = new WorkspaceId(command.workspaceId);
        const config = await this.configRepo.findByWorkspaceId(workspaceId);
        if (config) {
          config.updateDocsFolderPath(relocatedFolder.path);
          await this.configRepo.save(config);
        }
      }

      return Result.ok(void 0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to detect relocation';
      return Result.fail(message);
    }
  }

  private async buildCandidates(workspaceRoot: string): Promise<CandidateFolder[]> {
    const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(workspaceRoot));
    const ignorePatterns = config?.ignorePatterns || [];
    return this.scanner.scanWorkspaceForCandidates(ignorePatterns);
  }
}