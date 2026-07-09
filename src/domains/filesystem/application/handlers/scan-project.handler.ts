import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IWorkspaceRepository } from '../../../project/domain/repository/workspace-repository.interface';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { ScanProjectCommand } from '../commands/scan-project.command';
import { FileTreeDto } from '../dto/file-tree.dto';
import { FileNodeDto } from '../dto/file-node.dto';
import { FolderNodeDto } from '../dto/folder-node.dto';
import { IFileSystemRepository } from '../../domain/repository/filesystem-repository.interface';
import { ScanProjectService } from '../../domain/services/scan-project.service';
import { IgnorePattern } from '../../domain/value-objects/ignore-pattern';
import { FilePath } from '../../domain/value-objects/file-path';
import { FileNode } from '../../domain/entities/file-node';
import { FolderNode } from '../../domain/entities/folder-node';

import { IFileSystemAdapter } from '../ports/file-system-adapter.interface';

export class ScanProjectHandler implements ICommandHandler<ScanProjectCommand, FileTreeDto> {
  private readonly eventBus: EventBus;
  private readonly scanService: ScanProjectService;

  constructor(
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly configRepo: IProjectConfigRepository,
    private readonly fileSystemRepo: IFileSystemRepository,
    private readonly fileSystemAdapter: IFileSystemAdapter
  ) {
    this.eventBus = EventBus.getInstance();
    this.scanService = new ScanProjectService();
  }

  async execute(command: ScanProjectCommand): Promise<Result<FileTreeDto, string>> {
    try {
      const workspace = await this.workspaceRepo.findById(new WorkspaceId(command.workspaceId));
      if (!workspace) {
        return Result.fail(`Workspace not found: ${command.workspaceId}`);
      }

      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(command.workspaceId));
      if (!config) {
        return Result.fail(`Project config not found for workspace: ${command.workspaceId}`);
      }

      const ignorePatterns = this.buildIgnorePatterns(config.ignorePatterns);

      const fileMetadata = await this.fileSystemAdapter.scanDirectory(workspace.rootPath.value);

      const rootPath = new FilePath('.');
      const scanResult = this.scanService.scan(rootPath, ignorePatterns, fileMetadata);

      await this.saveTree(scanResult.rootFolder);

      for (const event of scanResult.events) {
        await this.eventBus.emit(event);
      }

      return Result.ok({
        root: this.mapFolderToDto(scanResult.rootFolder),
        totalFiles: scanResult.fileCount,
        totalFolders: scanResult.folderCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to scan project';
      return Result.fail(message);
    }
  }

  private buildIgnorePatterns(patternStrings: string[]): IgnorePattern[] {
    const patterns: IgnorePattern[] = [];
    for (const pattern of patternStrings) {
      try {
        patterns.push(new IgnorePattern(pattern));
      } catch {
        // Skip invalid patterns silently; they cannot match anything
      }
    }
    return patterns;
  }

  private async saveTree(node: FileNode | FolderNode): Promise<void> {
    await this.fileSystemRepo.save(node);
    if (node instanceof FolderNode) {
      for (const child of node.children) {
        await this.saveTree(child);
      }
    }
  }

  private mapFileToDto(node: FileNode): FileNodeDto {
    return {
      id: node.id.value,
      path: node.path.value,
      name: node.name,
      size: node.size.bytes,
      lastModified: node.lastModified.toISO(),
      isDirectory: false,
    };
  }

  private mapFolderToDto(node: FolderNode): FolderNodeDto {
    return {
      id: node.id.value,
      path: node.path.value,
      name: node.name,
      children: node.children.map(child =>
        child instanceof FileNode ? this.mapFileToDto(child) : this.mapFolderToDto(child)
      ),
    };
  }
}