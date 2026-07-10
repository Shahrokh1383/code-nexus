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
import { OrphanDetectedEvent } from '../../domain/events/orphan-detected';
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
      // The workspace ID is the normalized root path (see InitializeWorkspaceHandler)
      const workspaceRoot = command.workspaceId; // e.g., "C:/Users/.../CodeNexus"
      const config = await this.configRepo.findByWorkspaceId(new WorkspaceId(workspaceRoot));

      if (!config) {
        return Result.fail('Project configuration not found');
      }

      let docFolder: DocFolder;

      if (command.suggestedPath) {
        // The suggestedPath comes from a native folder dialog and is absolute.
        // We must convert it to a workspace‑relative path before storing.
        let normalizedPath = PathUtils.normalize(command.suggestedPath);

        // If the path is absolute (starts with a drive letter or '/'), make it relative
        if (PathUtils.isAbsolute(normalizedPath)) {
          normalizedPath = PathUtils.relative(workspaceRoot, normalizedPath);
        }

        // Ensure the folder exists (relative path now)
        const exists = await this.scanner.exists(normalizedPath);
        if (!exists) {
          return Result.fail(`Folder '${normalizedPath}' does not exist inside the workspace`);
        }

        const isDir = await this.scanner.isDirectory(normalizedPath);
        if (!isDir) {
          return Result.fail(`Path '${normalizedPath}' is not a directory`);
        }

        const files = await this.scanner.scanFolder(normalizedPath);
        const signature = DocFolderSignature.calculateFrom(files);
        docFolder = new DocFolder(
          DocFolderId.generate(),
          normalizedPath,
          signature,
          files.filter((f) => !f.isDirectory).length
        );
      } else {
        // No path provided: auto‑detect
        const candidates = await this.buildCandidates();
        const detectResult = this.detectorService.detect(candidates);

        if (detectResult.isFailure) {
          return Result.fail(detectResult.getError() || 'Failed to detect docs folder');
        }

        const detected = detectResult.getValue();
        if (!detected) {
          return Result.fail('Failed to detect docs folder');
        }

        docFolder = detected;
      }

      await this.docFolderRepo.save(docFolder);
      config.updateDocsFolderPath(docFolder.path);
      await this.configRepo.save(config);

      await this.createAndEmitDocuments(docFolder.path);

      return Result.ok(void 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register docs folder';
      return Result.fail(message);
    }
  }

  private async buildCandidates(): Promise<CandidateFolder[]> {
    const candidateNames = await this.scanner.listDirectories('');
    const candidates: CandidateFolder[] = [];

    for (const name of candidateNames) {
      const files = await this.scanner.scanFolder(name);
      candidates.push({ path: name, files });
    }

    return candidates;
  }

  private async createAndEmitDocuments(docsFolderPath: string): Promise<void> {
    const files = await this.scanner.scanFolder(docsFolderPath);
    const documentFiles = files.filter(
      (f) => !f.isDirectory && DOCUMENT_EXTENSIONS.test(f.name)
    );

    for (const file of documentFiles) {
      const relativePath = PathUtils.join(docsFolderPath, file.path);
      const document = new Document(
        DocumentId.generate(),
        new DocumentPath(relativePath),
        this.deriveTitle(file.name),
        new DateTime(file.lastModified),
        0
      );

      await this.documentRepo.save(document);
      await this.eventBus.emit(
        new DocumentDiscoveredEvent(document.id, document.path, document.title)
      );

      if (document.isOrphaned) {
        await this.eventBus.emit(
          new OrphanDetectedEvent(document.id, document.path)
        );
      }
    }
  }

  private deriveTitle(fileName: string): string {
    const base = fileName.replace(/\.[^/.]+$/, '');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
}