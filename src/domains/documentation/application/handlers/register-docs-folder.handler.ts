import { ICommandHandler } from '../../../shared-kernel/application/command-handler.interface';
import { Result } from '../../../shared-kernel/types/result';
import { EventBus } from '../../../shared-kernel/events/event-bus';
import { DateTime } from '../../../shared-kernel/types/date-time';
import { PathUtils } from '../../../shared-kernel/utils/path-utils';
import { WorkspaceId } from '../../../project/domain/value-objects/workspace-id';
import { IProjectConfigRepository } from '../../../project/domain/repository/project-config-repository.interface';
import { IDocFolderRepository } from '../../domain/repository/doc-folder-repository.interface';
import { IDocumentRepository } from '../../domain/repository/document-repository.interface';
import { DocsFolderDetectorService } from '../../domain/services/docs-folder-detector.service';
import { DocFolder } from '../../domain/entities/doc-folder';
import { Document } from '../../domain/entities/document';
import { DocFolderId } from '../../domain/value-objects/doc-folder-id';
import { DocumentId } from '../../domain/value-objects/document-id';
import { DocumentPath } from '../../domain/value-objects/document-path';
import { DocFolderSignature } from '../../domain/value-objects/doc-folder-signature';
import { CandidateFolder } from '../../domain/services/docs-folder-detector.service';
import { DocumentDiscoveredEvent } from '../../domain/events/document-discovered';
import { RegisterDocsFolderCommand } from '../commands/register-docs-folder.command';
import { IDocumentFolderScannerPort } from '../ports/document-folder-scanner-port.interface';

const DOCUMENT_EXTENSIONS = /\.(md|txt|rst|adoc|mdx)$/i;

export class RegisterDocsFolderHandler implements ICommandHandler<RegisterDocsFolderCommand, void> {
  private readonly eventBus: EventBus;

  constructor(
    private readonly docFolderRepo: IDocFolderRepository,
    private readonly documentRepo: IDocumentRepository,
    private readonly configRepo: IProjectConfigRepository,
    private readonly detectorService: DocsFolderDetectorService,
    private readonly scanner: IDocumentFolderScannerPort
  ) {
    this.eventBus = EventBus.getInstance();
  }

  async execute(command: RegisterDocsFolderCommand): Promise<Result<void, string>> {
    try {
      const workspaceRoot = command.workspaceId;
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(workspaceRoot));
      if (!config) return Result.fail('Project configuration not found');

      let docFolder: DocFolder;

      if (command.suggestedPath) {
        let normalizedPath = PathUtils.normalize(command.suggestedPath);
        if (PathUtils.isAbsolute(normalizedPath)) {
          normalizedPath = PathUtils.relative(workspaceRoot, normalizedPath);
        }

        const exists = await this.scanner.exists(normalizedPath);
        if (!exists) return Result.fail(`Folder '${normalizedPath}' does not exist`);
        
        const isDir = await this.scanner.isDirectory(normalizedPath);
        if (!isDir) return Result.fail(`Path '${normalizedPath}' is not a directory`);

        const files = await this.scanner.scanFolder(normalizedPath);
        const signature = DocFolderSignature.calculateFrom(files);
        docFolder = new DocFolder(
          DocFolderId.generate(),
          normalizedPath,
          signature,
          files.filter((f) => !f.isDirectory).length
        );
      } else {
        const candidates = await this.buildCandidates(workspaceRoot);
        const detectResult = this.detectorService.detect(candidates);
        if (detectResult.isFailure) return Result.fail(detectResult.getError() || 'Failed to detect docs folder');
        
        const detected = detectResult.getValue();
        if (!detected) return Result.fail('Failed to detect docs folder');
        docFolder = detected;
      }

      // SECURE FOLDER CHANGE: Migrate paths instead of deleting to preserve DocumentIDs and Links
      const existingFolder = await this.docFolderRepo.findByWorkspaceId(workspaceRoot);
      if (existingFolder && existingFolder.path !== docFolder.path) {
        await this.migrateDocumentPaths(existingFolder.path, docFolder.path);
      }

      await this.docFolderRepo.save(docFolder);
      config.updateDocsFolderPath(docFolder.path);
      await this.configRepo.save(config);

      await this.syncAndEmitDocuments(docFolder.path);
      return Result.ok(void 0);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Failed to register docs folder');
    }
  }

  private async migrateDocumentPaths(oldPath: string, newPath: string): Promise<void> {
    const oldDocs = await this.documentRepo.findByDocFolderPath(oldPath);
    for (const doc of oldDocs) {
      const relativePath = doc.path.value.slice(oldPath.length);
      const updatedPath = PathUtils.join(newPath, relativePath);
      doc.updatePath(new DocumentPath(updatedPath));
      await this.documentRepo.save(doc);
    }
  }

  private async buildCandidates(workspaceRoot: string): Promise<CandidateFolder[]> {
    const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(workspaceRoot));
    const ignorePatterns = config?.ignorePatterns || [];
    return this.scanner.scanWorkspaceForCandidates(ignorePatterns);
  }

  private async syncAndEmitDocuments(docsFolderPath: string): Promise<void> {
    const files = await this.scanner.scanFolder(docsFolderPath);
    const documentFiles = files.filter((f) => !f.isDirectory && DOCUMENT_EXTENSIONS.test(f.name));

    for (const file of documentFiles) {
      const relativePath = PathUtils.join(docsFolderPath, file.path);
      const existingDoc = await this.documentRepo.findByPath(new DocumentPath(relativePath));
      
      if (existingDoc) {
        // If it was previously deleted but reappeared, restore it
        if (existingDoc.deleted) {
          existingDoc.markAsRestored();
          await this.documentRepo.save(existingDoc);
        }
      } else {
        // Only create if it truly doesn't exist
        const document = new Document(
          DocumentId.generate(),
          new DocumentPath(relativePath),
          this.deriveTitle(file.name),
          new DateTime(file.lastModified),
          0
        );
        await this.documentRepo.save(document);
        await this.eventBus.emit(new DocumentDiscoveredEvent(document.id, document.path, document.title));
      }
    }
  }

  private deriveTitle(fileName: string): string {
    const base = fileName.replace(/\.[^/.]+$/, '');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
}